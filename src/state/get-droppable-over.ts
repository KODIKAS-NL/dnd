import type { Position, Rect } from 'css-box-model';
import type {
  DroppableDimension,
  DroppableDimensionMap,
  DroppableId,
  DraggableDimension,
  Axis,
} from '../types';
import { toDroppableList } from './dimension-structures';
import isPositionInFrame from './visibility/is-position-in-frame';
import { distance, patch } from './position';
import isWithin from './is-within';

// https://stackoverflow.com/questions/306316/determine-if-two-rectangles-overlap-each-other
// https://silentmatt.com/rectangle-intersection/
function getHasOverlap(first: Rect, second: Rect): boolean {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}

interface Args {
  pageBorderBox: Rect;
  draggable: DraggableDimension;
  droppables: DroppableDimensionMap;
}

interface WithDistance {
  distance: number;
  id: DroppableId;
}

interface GetFurthestArgs {
  pageBorderBox: Rect;
  draggable: DraggableDimension;
  candidates: DroppableDimension[];
}

function getArea(active: Rect | null): number {
  if (!active) {
    return 0;
  }

  return (active.right - active.left) * (active.bottom - active.top);
}

function getSmallestRectContainingCenter(
  pageBorderBox: Rect,
  candidates: DroppableDimension[],
): DroppableId | null {
  const containingCenter: DroppableDimension[] = candidates.filter(
    (candidate: DroppableDimension): boolean => {
      const active: Rect | null = candidate.subject.active;
      return Boolean(active && isPositionInFrame(active)(pageBorderBox.center));
    },
  );

  if (!containingCenter.length) {
    return null;
  }

  const sorted: DroppableDimension[] = [...containingCenter].sort(
    (first: DroppableDimension, second: DroppableDimension): number => {
      const firstArea: number = getArea(first.subject.active);
      const secondArea: number = getArea(second.subject.active);

      return firstArea - secondArea;
    },
  );

  return sorted[0].descriptor.id;
}

function isContainedBy(parent: Rect, child: Rect): boolean {
  return (
    parent.left <= child.left &&
    parent.right >= child.right &&
    parent.top <= child.top &&
    parent.bottom >= child.bottom
  );
}

function getClosestNestedDroppable(
  pageBorderBox: Rect,
  candidates: DroppableDimension[],
): DroppableId | null {
  const nested: DroppableDimension[] = candidates.filter(
    (candidate: DroppableDimension): boolean => {
      const active: Rect | null = candidate.subject.active;
      if (!active || !getHasOverlap(pageBorderBox, active)) {
        return false;
      }

      return candidates.some(
        (other: DroppableDimension): boolean =>
          other.descriptor.id !== candidate.descriptor.id &&
          Boolean(
            other.subject.active &&
              isContainedBy(other.subject.active, active),
          ),
      );
    },
  );

  if (!nested.length) {
    return null;
  }

  const sorted: DroppableDimension[] = [...nested].sort(
    (first: DroppableDimension, second: DroppableDimension): number => {
      const firstActive: Rect | null = first.subject.active;
      const secondActive: Rect | null = second.subject.active;
      const firstDistance: number = distance(
        pageBorderBox.center,
        patch(
          first.axis.line,
          pageBorderBox.center[first.axis.line],
          first.page.borderBox.center[first.axis.crossAxisLine],
        ),
      );
      const secondDistance: number = distance(
        pageBorderBox.center,
        patch(
          second.axis.line,
          pageBorderBox.center[second.axis.line],
          second.page.borderBox.center[second.axis.crossAxisLine],
        ),
      );

      if (firstDistance !== secondDistance) {
        return firstDistance - secondDistance;
      }

      return getArea(firstActive) - getArea(secondActive);
    },
  );

  return sorted[0].descriptor.id;
}

function getFurthestAway({
  pageBorderBox,
  draggable,
  candidates,
}: GetFurthestArgs): DroppableId | null {
  // We are not comparing the center of the home list with the target list as it would
  // give preference to giant lists

  // We are measuring the distance from where the draggable started
  // to where it is *hitting* the candidate
  // Note: The hit point might technically not be in the bounds of the candidate

  const startCenter: Position = draggable.page.borderBox.center;
  const sorted: WithDistance[] = candidates
    .map((candidate: DroppableDimension): WithDistance => {
      const axis: Axis = candidate.axis;
      const target: Position = patch(
        candidate.axis.line,
        // use the current center of the dragging item on the main axis
        pageBorderBox.center[axis.line],
        // use the center of the list on the cross axis
        candidate.page.borderBox.center[axis.crossAxisLine],
      );

      return {
        id: candidate.descriptor.id,
        distance: distance(startCenter, target),
      };
    })
    // largest value will be first
    .sort((a: WithDistance, b: WithDistance) => b.distance - a.distance);

  // just being safe
  return sorted[0] ? sorted[0].id : null;
}

export default function getDroppableOver({
  pageBorderBox,
  draggable,
  droppables,
}: Args): DroppableId | null {
  // We know at this point that some overlap has to exist
  const candidates: DroppableDimension[] = toDroppableList(droppables).filter(
    (item: DroppableDimension): boolean => {
      // Cannot be a candidate when disabled
      if (!item.isEnabled) {
        return false;
      }

      // Cannot be a candidate when there is no visible area
      const active: Rect | null = item.subject.active;
      if (!active) {
        return false;
      }

      // Cannot be a candidate when dragging item is not over the droppable at all
      if (!getHasOverlap(pageBorderBox, active)) {
        return false;
      }

      // 1. Candidate if the center position is over a droppable
      if (isPositionInFrame(active)(pageBorderBox.center)) {
        return true;
      }

      // 2. Candidate if an edge is over the cross axis half way point
      // 3. Candidate if dragging item is totally over droppable on cross axis

      const axis: Axis = item.axis;
      const childCenter: number = active.center[axis.crossAxisLine];
      const crossAxisStart: number = pageBorderBox[axis.crossAxisStart];
      const crossAxisEnd: number = pageBorderBox[axis.crossAxisEnd];

      const isContained = isWithin(
        active[axis.crossAxisStart],
        active[axis.crossAxisEnd],
      );

      const isStartContained: boolean = isContained(crossAxisStart);
      const isEndContained: boolean = isContained(crossAxisEnd);

      // Dragging item is totally covering the active area
      if (!isStartContained && !isEndContained) {
        return true;
      }

      /**
       * edges must go beyond the center line in order to avoid
       * cases were both conditions are satisfied.
       */
      if (isStartContained) {
        return crossAxisStart < childCenter;
      }

      return crossAxisEnd > childCenter;
    },
  );

  if (!candidates.length) {
    return null;
  }

  // A draggable that visually contains a nested droppable (for example a group
  // item containing a child list) should not treat that nested list as a
  // destination for itself. Doing so creates self-nesting impacts and unstable
  // placeholder geometry while dragging grouped containers.
  const candidatesExcludingOwnDescendants: DroppableDimension[] =
    candidates.filter((candidate: DroppableDimension): boolean => {
      const active: Rect | null = candidate.subject.active;
      return Boolean(
        active && !isContainedBy(draggable.page.borderBox, active),
      );
    });

  const availableCandidates: DroppableDimension[] =
    candidatesExcludingOwnDescendants.length
      ? candidatesExcludingOwnDescendants
      : candidates;

  // When the pointer is near a nested parent/group boundary, the nearest nested
  // candidate is more relevant than the ancestor that merely contains the same
  // pointer center. This prevents the larger root/group from taking precedence
  // before the nested boundary has been resolved.
  const closestNested = getClosestNestedDroppable(
    pageBorderBox,
    availableCandidates,
  );

  if (closestNested) {
    return closestNested;
  }

  // Prefer the smallest droppable that actually contains the pointer center.
  // This avoids dragging a large parent/group box from winning over the real
  // nested target when the pointer is well inside a nested area.
  const smallestContainingCenter = getSmallestRectContainingCenter(
    pageBorderBox,
    availableCandidates,
  );

  if (smallestContainingCenter) {
    return smallestContainingCenter;
  }

  // Only one candidate - use that!
  if (availableCandidates.length === 1) {
    return availableCandidates[0].descriptor.id;
  }

  // Multiple options returned
  // Should only occur with really large items
  // Going to use fallback: distance from home
  return getFurthestAway({
    pageBorderBox,
    draggable,
    candidates: availableCandidates,
  });
}
