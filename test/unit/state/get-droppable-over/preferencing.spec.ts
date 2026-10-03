import type { Rect } from 'css-box-model';
import {
  getDroppableDimension,
  getDraggableDimension,
} from '../../../util/dimension';
import type {
  DraggableDimension,
  DroppableDimension,
} from '../../../../src/types';
import { getOffsetForCrossAxisEndEdge } from '../get-drag-impact/util/get-offset-for-edge';
import { offsetRectByPosition } from '../../../../src/state/rect';
import getDroppableOver from '../../../../src/state/get-droppable-over';
import { toDroppableMap } from '../../../../src/state/dimension-structures';
import { afterCrossAxisPoint } from '../../../util/after-point';

const droppableOrigin: DroppableDimension = getDroppableDimension({
  descriptor: {
    id: 'large',
    type: 'standard',
    mode: 'standard',
  },
  borderBox: {
    top: 0,
    left: 0,
    right: 600,
    bottom: 600,
  },
});

const droppableFirst: DroppableDimension = getDroppableDimension({
  descriptor: {
    id: 'small',
    type: 'standard',
    mode: 'standard',
  },
  borderBox: {
    top: 1000,
    left: 1000,
    right: 1100,
    bottom: 1100,
  },
});

const droppableSecond: DroppableDimension = getDroppableDimension({
  descriptor: {
    id: 'secondary',
    type: 'standard',
    mode: 'standard',
  },
  borderBox: {
    top: 1000,
    left: 1200,
    right: 1300,
    // This is really tall to test the distance calculation against varied lists
    bottom: 8000,
  },
});

const droppableThird: DroppableDimension = getDroppableDimension({
  descriptor: {
    id: 'tertiary',
    type: 'standard',
    mode: 'standard',
  },
  borderBox: {
    top: 1000,
    left: 1400,
    right: 1500,
    bottom: 1100,
  },
});

const draggable: DraggableDimension = getDraggableDimension({
  descriptor: {
    id: 'my draggable',
    index: 0,
    type: droppableOrigin.descriptor.type,
    droppableId: droppableOrigin.descriptor.id,
  },
  borderBox: droppableOrigin.client.borderBox,
});

/**
 * In this case we're hovering over all three lists.
 * We expect that the furthest away active element is returned.
 */
it('should prefer the furthest away droppable when multiple lists are hit', () => {
  const offset = getOffsetForCrossAxisEndEdge({
    crossAxisEndEdgeOn: droppableThird.page.borderBox.center,
    dragging: draggable.page.borderBox,
    axis: droppableThird.axis,
  });

  const pageBorderBox: Rect = offsetRectByPosition(
    draggable.page.borderBox,
    afterCrossAxisPoint(droppableThird.axis, offset),
  );

  const result = getDroppableOver({
    pageBorderBox,
    draggable,
    droppables: toDroppableMap([
      droppableOrigin,
      droppableFirst,
      droppableSecond,
      droppableThird,
    ]),
  });

  expect(result).toEqual(droppableThird.descriptor.id);
});

/**
 * In this case we're hovering over the primary and secondary and lists.
 * We expect that the furthest away active element is returned (not including the tertiary list).
 */
it('should prefer the second furthest away droppable when multiple lists are hit', () => {
  const offset = getOffsetForCrossAxisEndEdge({
    crossAxisEndEdgeOn: droppableSecond.page.borderBox.center,
    dragging: draggable.page.borderBox,
    axis: droppableSecond.axis,
  });

  const pageBorderBox: Rect = offsetRectByPosition(
    draggable.page.borderBox,
    afterCrossAxisPoint(droppableSecond.axis, offset),
  );

  const result = getDroppableOver({
    pageBorderBox,
    draggable,
    droppables: toDroppableMap([
      droppableOrigin,
      droppableFirst,
      droppableSecond,
      droppableThird,
    ]),
  });

  expect(result).toEqual(droppableSecond.descriptor.id);
});

it('should prefer the smallest droppable containing the pointer center when nested droppables overlap', () => {
  const root: DroppableDimension = getDroppableDimension({
    descriptor: {
      id: 'root',
      type: 'standard',
      mode: 'standard',
    },
    borderBox: {
      top: 0,
      left: 0,
      right: 300,
      bottom: 300,
    },
  });

  const parent: DroppableDimension = getDroppableDimension({
    descriptor: {
      id: 'parent',
      type: 'standard',
      mode: 'standard',
    },
    borderBox: {
      top: 50,
      left: 50,
      right: 250,
      bottom: 250,
    },
  });

  const child: DroppableDimension = getDroppableDimension({
    descriptor: {
      id: 'child',
      type: 'standard',
      mode: 'standard',
    },
    borderBox: {
      top: 100,
      left: 100,
      right: 200,
      bottom: 200,
    },
  });

  const dragging: DraggableDimension = getDraggableDimension({
    descriptor: {
      id: 'dragging',
      index: 0,
      type: root.descriptor.type,
      droppableId: root.descriptor.id,
    },
    borderBox: {
      top: 130,
      left: 130,
      right: 170,
      bottom: 170,
    },
  });

  const pageBorderBox: Rect = dragging.page.borderBox;

  const result = getDroppableOver({
    pageBorderBox,
    draggable: dragging,
    droppables: toDroppableMap([root, parent, child]),
  });

  expect(result).toEqual(child.descriptor.id);
});

it('should prefer the closest nested droppable when the pointer is positioned just above a parent droppable', () => {
  const root: DroppableDimension = getDroppableDimension({
    descriptor: {
      id: 'root',
      type: 'standard',
      mode: 'standard',
    },
    borderBox: {
      top: 0,
      left: 0,
      right: 400,
      bottom: 400,
    },
  });

  const parent: DroppableDimension = getDroppableDimension({
    descriptor: {
      id: 'parent',
      type: 'standard',
      mode: 'standard',
    },
    borderBox: {
      top: 100,
      left: 50,
      right: 250,
      bottom: 250,
    },
  });

  const dragging: DraggableDimension = getDraggableDimension({
    descriptor: {
      id: 'dragging',
      index: 0,
      type: root.descriptor.type,
      droppableId: root.descriptor.id,
    },
    borderBox: {
      top: 60,
      left: 120,
      right: 180,
      bottom: 120,
    },
  });

  const result = getDroppableOver({
    pageBorderBox: dragging.page.borderBox,
    draggable: dragging,
    droppables: toDroppableMap([root, parent]),
  });

  expect(result).toEqual(parent.descriptor.id);
});

it('should ignore a nested droppable that is contained by the dragging item itself', () => {
  const root: DroppableDimension = getDroppableDimension({
    descriptor: {
      id: 'root',
      type: 'standard',
      mode: 'standard',
    },
    borderBox: {
      top: 0,
      left: 0,
      right: 500,
      bottom: 500,
    },
  });

  const nestedInsideDragging: DroppableDimension = getDroppableDimension({
    descriptor: {
      id: 'nested-inside-dragging',
      type: 'standard',
      mode: 'standard',
    },
    borderBox: {
      top: 150,
      left: 150,
      right: 300,
      bottom: 300,
    },
  });

  const draggingContainer: DraggableDimension = getDraggableDimension({
    descriptor: {
      id: 'dragging-container',
      index: 0,
      type: root.descriptor.type,
      droppableId: root.descriptor.id,
    },
    borderBox: {
      top: 100,
      left: 100,
      right: 350,
      bottom: 350,
    },
  });

  const result = getDroppableOver({
    pageBorderBox: draggingContainer.page.borderBox,
    draggable: draggingContainer,
    droppables: toDroppableMap([root, nestedInsideDragging]),
  });

  expect(result).toEqual(root.descriptor.id);
});

it('should keep a contained candidate when there is no non-contained containing candidate', () => {
  const isolated: DroppableDimension = getDroppableDimension({
    descriptor: {
      id: 'isolated',
      type: 'standard',
      mode: 'standard',
    },
    borderBox: {
      top: 100,
      left: 100,
      right: 260,
      bottom: 260,
    },
  });

  const dragging: DraggableDimension = getDraggableDimension({
    descriptor: {
      id: 'dragging',
      index: 0,
      type: isolated.descriptor.type,
      droppableId: isolated.descriptor.id,
    },
    borderBox: {
      top: 80,
      left: 80,
      right: 280,
      bottom: 280,
    },
  });

  const result = getDroppableOver({
    pageBorderBox: dragging.page.borderBox,
    draggable: dragging,
    droppables: toDroppableMap([isolated]),
  });

  expect(result).toEqual(isolated.descriptor.id);
});
