import React, { ReactElement, useState } from 'react';
import styled from '@emotion/styled';
import { colors } from '@atlaskit/theme';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import type {
  DraggableProvided,
  DraggableRubric,
  DraggableStateSnapshot,
  DropResult,
  DroppableProvided,
  DroppableStateSnapshot,
} from '@hello-pangea/dnd';
import { grid } from '../constants';

type ItemNode = {
  id: string;
  kind: 'item';
  title: string;
};

type GroupNode = {
  id: string;
  kind: 'group';
  title: string;
  children: TreeNode[];
};

type TreeNode = ItemNode | GroupNode;

type TreeState = {
  root: TreeNode[];
};

const ROOT_DROPPABLE_ID = 'drop:root';
const NODE_TYPE = 'TREE_NODE';

const initialTree: TreeState = {
  root: [
    { id: 'item-a', kind: 'item', title: 'Top item A' },
    { id: 'item-b', kind: 'item', title: 'Top item B' },
    {
      id: 'group-1',
      kind: 'group',
      title: 'Group 1',
      children: [
        { id: 'item-g1-a', kind: 'item', title: 'Group 1 / item A' },
        { id: 'item-g1-b', kind: 'item', title: 'Group 1 / item B' },
      ],
    },
    { id: 'item-c', kind: 'item', title: 'Top item C' },
    {
      id: 'group-2',
      kind: 'group',
      title: 'Group 2',
      children: [
        { id: 'item-g2-a', kind: 'item', title: 'Group 2 / item A' },
        { id: 'item-g2-b', kind: 'item', title: 'Group 2 / item B' },
      ],
    },
    { id: 'item-d', kind: 'item', title: 'Top item D' },
    { id: 'item-e', kind: 'item', title: 'Top item E' },
  ],
};

const Root = styled.div`
  background: ${colors.B200};
  min-height: 100vh;
  padding: ${grid * 2}px;
`;

const Container = styled.div`
  max-width: 680px;
  margin: 0 auto;
`;

const HelpText = styled.p`
  color: ${colors.N800};
  margin: 0 0 ${grid * 2}px;
`;

const List = styled.div<{ isDraggingOver: boolean; isRoot?: boolean }>`
  background: ${({ isDraggingOver }): string =>
    isDraggingOver ? colors.B50 : colors.N20};
  border-radius: 6px;
  border: 2px solid ${({ isDraggingOver }): string =>
    isDraggingOver ? colors.B300 : colors.N40};
  padding: ${grid}px;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
  min-height: ${({ isRoot }): string => (isRoot ? '80px' : '20px')};
`;

const NodeCard = styled.div<{
  isDragging: boolean;
  isGroup: boolean;
}>`
  background: ${({ isDragging, isGroup }): string => {
    if (isDragging) {
      return colors.Y50;
    }
    return isGroup ? colors.B50 : colors.N0;
  }};
  border: 1px solid ${({ isDragging, isGroup }): string => {
    if (isDragging) {
      return colors.Y300;
    }
    return isGroup ? colors.P200 : colors.N60;
  }};
  border-radius: 4px;
  margin-bottom: ${grid}px;
  box-shadow: ${({ isDragging }): string =>
    isDragging ? '0 2px 12px rgba(9, 30, 66, 0.25)' : 'none'};
`;

const DragHandle = styled.div`
  cursor: grab;
  user-select: none;
  padding: ${grid}px;
  font-weight: 600;
`;

const GroupChildren = styled.div`
  padding: 0 ${grid}px ${grid}px ${grid}px;
`;

const EmptyText = styled.div`
  color: ${colors.N300};
  font-size: 12px;
  padding: ${grid / 2}px ${grid}px ${grid}px ${grid}px;
`;

const CloneChildrenList = styled.div`
  background: ${colors.B50};
  border-radius: 6px;
  border: 2px solid ${colors.B300};
  padding: ${grid}px;
`;

const makeDraggableId = (nodeId: string): string => `node:${nodeId}`;
const makeDroppableId = (groupId: string): string => `drop:group:${groupId}`;

const getNodeIdFromDraggableId = (draggableId: string): string =>
  draggableId.replace(/^node:/, '');

const getParentIdFromDroppableId = (
  droppableId: string,
): string | 'root' | null => {
  if (droppableId === ROOT_DROPPABLE_ID) {
    return 'root';
  }

  const match = /^drop:group:(.+)$/.exec(droppableId);
  return match ? match[1] : null;
};

const cloneNode = (node: TreeNode): TreeNode =>
  node.kind === 'item'
    ? { ...node }
    : { ...node, children: node.children.map(cloneNode) };

const getChildrenByParentId = (
  state: TreeState,
  parentId: string | 'root',
): TreeNode[] | null => {
  if (parentId === 'root') {
    return state.root;
  }

  const queue: TreeNode[] = [...state.root];
  while (queue.length) {
    const current = queue.shift();
    if (!current || current.kind !== 'group') {
      continue;
    }

    if (current.id === parentId) {
      return current.children;
    }

    queue.push(...current.children);
  }

  return null;
};

const findNodeById = (state: TreeState, nodeId: string): TreeNode | null => {
  const queue: TreeNode[] = [...state.root];
  while (queue.length) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    if (current.id === nodeId) {
      return current;
    }
    if (current.kind === 'group') {
      queue.push(...current.children);
    }
  }
  return null;
};

const isDescendantGroup = (
  ancestorGroup: GroupNode,
  candidateGroupId: string,
): boolean => {
  const queue: TreeNode[] = [...ancestorGroup.children];
  while (queue.length) {
    const current = queue.shift();
    if (!current || current.kind !== 'group') {
      continue;
    }
    if (current.id === candidateGroupId) {
      return true;
    }
    queue.push(...current.children);
  }
  return false;
};

const moveNode = (
  state: TreeState,
  sourceParentId: string | 'root',
  sourceIndex: number,
  destinationParentId: string | 'root',
  destinationIndex: number,
): TreeState | null => {
  const next: TreeState = {
    root: state.root.map(cloneNode),
  };

  const sourceChildren = getChildrenByParentId(next, sourceParentId);
  const destinationChildren = getChildrenByParentId(next, destinationParentId);

  if (!sourceChildren || !destinationChildren) {
    return null;
  }

  const [removed] = sourceChildren.splice(sourceIndex, 1);
  if (!removed) {
    return null;
  }

  destinationChildren.splice(destinationIndex, 0, removed);
  return next;
};

const renderNodeTitle = (node: TreeNode): string =>
  node.kind === 'group' ? `📁 ${node.title}` : `📄 ${node.title}`;

const NestedDropAreasApp = (): ReactElement => {
  const [tree, setTree] = useState<TreeState>(initialTree);

  const topLevelCount = tree.root.length;

  const onDragEnd = (result: DropResult): void => {
    if (!result.destination) {
      return;
    }

    const sourceParentId = getParentIdFromDroppableId(result.source.droppableId);
    const destinationParentId = getParentIdFromDroppableId(
      result.destination.droppableId,
    );

    if (!sourceParentId || !destinationParentId) {
      return;
    }

    if (
      sourceParentId === destinationParentId &&
      result.source.index === result.destination.index
    ) {
      return;
    }

    const movedNodeId = getNodeIdFromDraggableId(result.draggableId);
    const movedNode = findNodeById(tree, movedNodeId);
    if (!movedNode) {
      return;
    }

    if (movedNode.kind === 'group' && destinationParentId !== 'root') {
      if (destinationParentId === movedNode.id) {
        return;
      }
      if (isDescendantGroup(movedNode, destinationParentId)) {
        return;
      }
    }

    const next = moveNode(
      tree,
      sourceParentId,
      result.source.index,
      destinationParentId,
      result.destination.index,
    );
    if (!next) {
      return;
    }

    setTree(next);
  };

  const renderCloneChildren = (children: TreeNode[]): ReactElement => (
    <GroupChildren>
      <CloneChildrenList>
        {children.map((child: TreeNode) => (
          <NodeCard key={child.id} isDragging={false} isGroup={child.kind === 'group'}>
            <DragHandle>{renderNodeTitle(child)}</DragHandle>
            {child.kind === 'group' ? renderCloneChildren(child.children) : null}
          </NodeCard>
        ))}
        {children.length === 0 ? <EmptyText>Drop here</EmptyText> : null}
      </CloneChildrenList>
    </GroupChildren>
  );

  const renderNodeCard = (
    node: TreeNode,
    provided: DraggableProvided,
    snapshot: DraggableStateSnapshot,
    isClone: boolean = false,
  ): ReactElement => (
    <NodeCard
      ref={provided.innerRef}
      {...provided.draggableProps}
      isDragging={snapshot.isDragging}
      isGroup={node.kind === 'group'}
    >
      <DragHandle {...provided.dragHandleProps}>{renderNodeTitle(node)}</DragHandle>
      {node.kind === 'group'
        ? isClone
          ? renderCloneChildren(node.children)
          : (
            <GroupChildren>
              <Droppable
                droppableId={makeDroppableId(node.id)}
                type={NODE_TYPE}
                renderClone={renderClone}
                getContainerForClone={getCloneContainer}
              >
                {(
                  nestedProvided: DroppableProvided,
                  nestedSnapshot: DroppableStateSnapshot,
                ): ReactElement => (
                  <List
                    ref={nestedProvided.innerRef}
                    {...nestedProvided.droppableProps}
                    isDraggingOver={nestedSnapshot.isDraggingOver}
                  >
                    {node.children.map(renderNode)}
                    {node.children.length === 0 ? (
                      <EmptyText>Drop here</EmptyText>
                    ) : null}
                    {nestedProvided.placeholder}
                  </List>
                )}
              </Droppable>
            </GroupChildren>
            )
        : null}
    </NodeCard>
  );

  const getCloneContainer = (): HTMLElement => document.body;

  const renderClone = (
    provided: DraggableProvided,
    snapshot: DraggableStateSnapshot,
    rubric: DraggableRubric,
  ): ReactElement => {
    const nodeId = getNodeIdFromDraggableId(rubric.draggableId);
    const node = findNodeById(tree, nodeId);

    if (!node) {
      return (
        <NodeCard
          ref={provided.innerRef}
          {...provided.draggableProps}
          isDragging={snapshot.isDragging}
          isGroup={false}
        >
          <DragHandle {...provided.dragHandleProps}>Missing node</DragHandle>
        </NodeCard>
      );
    }

    return renderNodeCard(node, provided, snapshot, true);
  };

  const renderNode = (node: TreeNode, index: number): ReactElement => (
    <Draggable draggableId={makeDraggableId(node.id)} index={index} key={node.id}>
      {(
        provided: DraggableProvided,
        snapshot: DraggableStateSnapshot,
      ): ReactElement => renderNodeCard(node, provided, snapshot)}
    </Draggable>
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Root>
        <Container>
          <HelpText>
            Top-level nodes: {topLevelCount}. You can reorder nodes at the same
            level, move items between groups, move an item from group to top
            level, and move a group into another group.
          </HelpText>
          <Droppable droppableId={ROOT_DROPPABLE_ID} type={NODE_TYPE}>
            {(
              provided: DroppableProvided,
              snapshot: DroppableStateSnapshot,
            ): ReactElement => (
              <List
                ref={provided.innerRef}
                {...provided.droppableProps}
                isDraggingOver={snapshot.isDraggingOver}
                isRoot
              >
                {tree.root.map(renderNode)}
                {provided.placeholder}
              </List>
            )}
          </Droppable>
        </Container>
      </Root>
    </DragDropContext>
  );
};

export default NestedDropAreasApp;
