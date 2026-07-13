import {
  Button,
  Color,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Node,
  UITransform,
  Vec3,
  VerticalTextAlignment
} from 'cc';

export function addPanel(
  parent: Node,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: Color,
  stroke?: Color,
  radius = 8
): Node {
  const node = new Node(name);
  parent.addChild(node);
  node.layer = parent.layer;
  node.setPosition(new Vec3(x, y));
  node.addComponent(UITransform).setContentSize(width, height);

  const graphics = node.addComponent(Graphics);
  graphics.fillColor = fill;
  graphics.roundRect(-width / 2, -height / 2, width, height, radius);
  graphics.fill();
  if (stroke) {
    graphics.strokeColor = stroke;
    graphics.lineWidth = 3;
    graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    graphics.stroke();
  }
  return node;
}

export function addText(
  parent: Node,
  name: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  color: Color
): Label {
  const node = new Node(name);
  parent.addChild(node);
  node.layer = parent.layer;
  node.setPosition(new Vec3(x, y));
  node.addComponent(UITransform).setContentSize(width, height);

  const label = node.addComponent(Label);
  label.string = text;
  label.fontSize = fontSize;
  label.lineHeight = Math.ceil(fontSize * 1.25);
  label.color = color;
  label.horizontalAlign = HorizontalTextAlignment.CENTER;
  label.verticalAlign = VerticalTextAlignment.CENTER;
  label.overflow = Label.Overflow.SHRINK;
  label.enableWrapText = true;
  label.useSystemFont = true;
  label.fontFamily = 'PingFang SC';
  return label;
}

export function addButton(
  parent: Node,
  name: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: Color,
  onClick: () => void
): Node {
  const node = addPanel(parent, name, x, y, width, height, fill, new Color(91, 64, 55), 8);
  addText(node, `${name}Label`, text, 0, 0, width - 18, height - 12, 26, new Color(255, 252, 240));
  node.addComponent(Button);
  node.on(Button.EventType.CLICK, onClick);
  return node;
}
