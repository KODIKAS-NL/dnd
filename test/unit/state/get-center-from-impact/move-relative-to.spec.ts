import { createBox } from 'css-box-model';
import type { BoxModel, Spacing, Position } from 'css-box-model';
import type { Axis } from '../../../../src/types';
import {
  goBefore,
  goAfter,
  goIntoStart,
} from '../../../../src/state/get-center-from-impact/move-relative-to';
import { vertical, horizontal } from '../../../../src/state/axis';
import { patch } from '../../../../src/state/position';

let spacing = 1;

const getAssortedSpacing = (): Spacing => ({
  top: spacing++,
  right: spacing++,
  bottom: spacing++,
  left: spacing++,
});

const moveRelativeTo: BoxModel = createBox({
  borderBox: {
    top: 0,
    left: 0,
    right: 100,
    bottom: 100,
  },
  margin: getAssortedSpacing(),
  border: getAssortedSpacing(),
  padding: getAssortedSpacing(),
});

const isMoving: BoxModel = createBox({
  borderBox: {
    top: 400,
    left: 400,
    right: 500,
    bottom: 500,
  },
  margin: getAssortedSpacing(),
  border: getAssortedSpacing(),
  padding: getAssortedSpacing(),
});

const distanceFromStartToCenter = (axis: Axis, box: BoxModel): number =>
  box.margin[axis.start] + box.borderBox[axis.size] / 2;

const distanceFromStartToBorderBoxCenter = (axis: Axis, box: BoxModel): number =>
  box.margin[axis.start] + box.borderBox[axis.size] / 2;

const distanceFromEndToCenter = (axis: Axis, box: BoxModel): number =>
  box.margin[axis.end] + box.borderBox[axis.size] / 2;

[vertical, horizontal].forEach((axis: Axis) => {
  describe(`on ${axis.direction} axis`, () => {
    it('should align before the target', () => {
      const newCenter: Position = goBefore({
        axis,
        moveRelativeTo,
        isMoving,
      });

      const expected: Position = patch(
        axis.line,
        // align against the target border box so nested parents/groups do not
        // add an extra offset when the pointer crosses upward past the parent.
        moveRelativeTo.borderBox[axis.start] -
          distanceFromEndToCenter(axis, isMoving),
        moveRelativeTo.borderBox[axis.crossAxisStart] +
          isMoving.margin[axis.crossAxisStart] +
          isMoving.borderBox[axis.crossAxisSize] / 2,
      );

      expect(newCenter).toEqual(expected);
    });

    it('should align after the target', () => {
      const newCenter: Position = goAfter({
        axis,
        moveRelativeTo,
        isMoving,
      });

      const expected: Position = patch(
        axis.line,
        // align against the target border box so nested parents/groups do not
        // add an extra offset when the pointer crosses upward past the parent.
        moveRelativeTo.borderBox[axis.end] +
          distanceFromStartToBorderBoxCenter(axis, isMoving),
        moveRelativeTo.borderBox[axis.crossAxisStart] +
          isMoving.margin[axis.crossAxisStart] +
          isMoving.borderBox[axis.crossAxisSize] / 2,
      );

      expect(newCenter).toEqual(expected);
    });

    it('should move into the start of the context box of the target', () => {
      const newCenter: Position = goIntoStart({
        axis,
        moveInto: moveRelativeTo,
        isMoving,
      });

      const expected: Position = patch(
        axis.line,
        // start from the start of the context box of the target
        moveRelativeTo.contentBox[axis.start] +
          // add the distance from the start to the center of the moving item
          distanceFromStartToCenter(axis, isMoving),
        // start at the cross axis start of the item we are moving relative to
        moveRelativeTo.contentBox[axis.crossAxisStart] +
          isMoving.margin[axis.crossAxisStart] +
          isMoving.borderBox[axis.crossAxisSize] / 2,
      );

      expect(newCenter).toEqual(expected);
    });
  });
});
