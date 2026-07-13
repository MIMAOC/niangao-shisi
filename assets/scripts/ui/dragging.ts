import { EventTouch, Node, Vec2, Vec3 } from 'cc';

/** 手指挪过这个距离才算拖，否则算点一下。 */
export const DRAG_THRESHOLD = 10;

export interface DragHandlers {
  /** 拖动真正开始时调用一次（背包 / 备料台 / 食材都要在这时收起选中态）。 */
  onDragStart?: () => void;
  /** 没拖动，只是点了一下。 */
  onTap: () => void;
  /** 松手时调用，node 停在手指最后的位置上，由调用方决定落到哪一格。 */
  onDrop: (node: Node) => void;
}

/**
 * 给节点装上「点一下 / 拖着走」的手势。每个节点各自持有自己的起点和拖动状态，
 * 所以调用方不用再为背包、备料台、食材各养一套 startTouch / startPosition / dragging 字段。
 */
export function makeDraggable(node: Node, handlers: DragHandlers): void {
  const startTouch = new Vec2();
  const startPosition = new Vec3();
  let dragging = false;

  node.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
    const location = event.getUILocation();
    startTouch.set(location.x, location.y);
    startPosition.set(node.position);
    dragging = false;
    // 拖动中的节点浮到同层最上面，免得被别的格子盖住。
    node.setSiblingIndex(node.parent ? node.parent.children.length - 1 : 0);
  });

  node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
    const location = event.getUILocation();
    const deltaX = location.x - startTouch.x;
    const deltaY = location.y - startTouch.y;

    if (!dragging && Math.hypot(deltaX, deltaY) > DRAG_THRESHOLD) {
      dragging = true;
      handlers.onDragStart?.();
    }
    if (dragging) {
      node.setPosition(startPosition.x + deltaX, startPosition.y + deltaY);
    }
  });

  const end = (): void => {
    if (!dragging) {
      handlers.onTap();
      return;
    }
    dragging = false;
    handlers.onDrop(node);
  };

  node.on(Node.EventType.TOUCH_END, end);
  node.on(Node.EventType.TOUCH_CANCEL, end);
}
