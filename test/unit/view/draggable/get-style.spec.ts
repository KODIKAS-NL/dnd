import getStyle from '../../../../src/view/draggable/get-style';
import type {
  DraggingMapProps,
  DraggingStyle,
} from '../../../../src/view/draggable/draggable-types';
import { getPreset } from '../../../util/dimension';
import { getDraggingSnapshot } from '../connected-draggable/util/get-snapshot';

const preset = getPreset();

const getDraggingMapProps = (): DraggingMapProps => ({
  type: 'DRAGGING',
  offset: { x: 0, y: 0 },
  mode: 'FLUID',
  dropping: null,
  draggingOver: preset.home.descriptor.id,
  combineWith: null,
  dimension: preset.inHome1,
  forceShouldAnimate: null,
  snapshot: getDraggingSnapshot({
    mode: 'FLUID',
    draggingOver: preset.home.descriptor.id,
    combineWith: null,
    dropping: null,
  }),
});

it('should position dragging items from their original margin box when there is no transformed ancestor', () => {
  const mapped: DraggingMapProps = getDraggingMapProps();
  const style = getStyle(mapped) as DraggingStyle;

  expect(style.position).toBe('fixed');
  expect(style.top).toBe(mapped.dimension.client.marginBox.top);
  expect(style.left).toBe(mapped.dimension.client.marginBox.left);
});

it('should compensate for transformed containing block ancestors', () => {
  const mapped: DraggingMapProps = getDraggingMapProps();

  const transformedParent: HTMLDivElement = document.createElement('div');
  transformedParent.style.transform = 'translateY(10px)';

  const draggingElement: HTMLDivElement = document.createElement('div');
  transformedParent.appendChild(draggingElement);
  document.body.appendChild(transformedParent);

  transformedParent.getBoundingClientRect = (() =>
    ({
      top: 80,
      left: 120,
      right: 320,
      bottom: 280,
      width: 200,
      height: 200,
      x: 120,
      y: 80,
      toJSON: () => ({}),
    }) as DOMRect) as typeof transformedParent.getBoundingClientRect;

  const style = getStyle(mapped, draggingElement) as DraggingStyle;

  expect(style.top).toBe(mapped.dimension.client.marginBox.top - 80);
  expect(style.left).toBe(mapped.dimension.client.marginBox.left - 120);

  document.body.removeChild(transformedParent);
});

it('should detect a containing block parent that becomes transformed after initial reads', () => {
  const mapped: DraggingMapProps = getDraggingMapProps();

  const parent: HTMLDivElement = document.createElement('div');
  const draggingElement: HTMLDivElement = document.createElement('div');
  parent.appendChild(draggingElement);
  document.body.appendChild(parent);

  const initialStyle = getStyle(mapped, draggingElement) as DraggingStyle;
  expect(initialStyle.top).toBe(mapped.dimension.client.marginBox.top);
  expect(initialStyle.left).toBe(mapped.dimension.client.marginBox.left);

  parent.style.transform = 'translateY(10px)';
  parent.getBoundingClientRect = (() =>
    ({
      top: 40,
      left: 60,
      right: 260,
      bottom: 240,
      width: 200,
      height: 200,
      x: 60,
      y: 40,
      toJSON: () => ({}),
    }) as DOMRect) as typeof parent.getBoundingClientRect;

  const transformedStyle = getStyle(mapped, draggingElement) as DraggingStyle;
  expect(transformedStyle.top).toBe(mapped.dimension.client.marginBox.top - 40);
  expect(transformedStyle.left).toBe(
    mapped.dimension.client.marginBox.left - 60,
  );

  document.body.removeChild(parent);
});
