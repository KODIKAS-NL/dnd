import type { Position, BoxModel, Rect } from 'css-box-model';
import { patch } from '../position';
import type { Axis } from '../../types';

interface Args {
  axis: Axis;
  moveRelativeTo: BoxModel;
  isMoving: BoxModel;
}

const distanceFromStartToBorderBoxCenter = (
  axis: Axis,
  box: BoxModel,
): number => box.margin[axis.start] + box.borderBox[axis.size] / 2;

const distanceFromEndToBorderBoxCenter = (axis: Axis, box: BoxModel): number =>
  box.margin[axis.end] + box.borderBox[axis.size] / 2;

// We align the moving item against the cross axis start of the target
// We used to align the moving item cross axis center with the cross axis center of the target.
// However, this leads to a bad experience when reordering columns
const getCrossAxisBorderBoxCenter = (
  axis: Axis,
  target: Rect,
  isMoving: BoxModel,
): number =>
  target[axis.crossAxisStart] +
  isMoving.margin[axis.crossAxisStart] +
  isMoving.borderBox[axis.crossAxisSize] / 2;

export const goAfter = ({ axis, moveRelativeTo, isMoving }: Args): Position =>
  patch(
    axis.line,
    // Use the target border box as the insertion anchor. The dragging item is
    // positioned from its own border-box center, and the margin-box anchor makes
    // the overlay drift when moving across nested container boundaries.
    moveRelativeTo.borderBox[axis.end] +
      distanceFromStartToBorderBoxCenter(axis, isMoving),
    getCrossAxisBorderBoxCenter(axis, moveRelativeTo.borderBox, isMoving),
  );

export const goBefore = ({ axis, moveRelativeTo, isMoving }: Args): Position =>
  patch(
    axis.line,
    // Use the target border box for the pre-insert anchor to keep the dragged
    // item's visual offset stable above nested parents and groups.
    moveRelativeTo.borderBox[axis.start] -
      distanceFromEndToBorderBoxCenter(axis, isMoving),
    getCrossAxisBorderBoxCenter(axis, moveRelativeTo.borderBox, isMoving),
  );

interface GoIntoArgs {
  axis: Axis;
  moveInto: BoxModel;
  isMoving: BoxModel;
}

// moves into the content box
export const goIntoStart = ({
  axis,
  moveInto,
  isMoving,
}: GoIntoArgs): Position =>
  patch(
    axis.line,
    moveInto.contentBox[axis.start] +
      distanceFromStartToBorderBoxCenter(axis, isMoving),
    getCrossAxisBorderBoxCenter(axis, moveInto.contentBox, isMoving),
  );
