import * as THREE from 'three';

var three_sprite_utils_vars = {
    spriteInfoStorage: [],
    spriteParams: null,
    scene_src: null
};

//This array will store
export function SetScene(_scene_src) {
    three_sprite_utils_vars.scene_src = _scene_src;
}
export function SwitchSprite(_str, _position, attachedObject) {
    var sprite_tmp;
    sprite_tmp = findSprite(attachedObject);
    if (sprite_tmp == null) return CreateSprite(_str, _position, attachedObject);
    else {
        return RemoveSprite(attachedObject);
    }
}
export function RemoveSprite(attachedObject) {
    var spriteIndex = findSpriteIndex(attachedObject);
    if (spriteIndex == -1) return null;
    three_sprite_utils_vars.scene_src.remove(three_sprite_utils_vars.spriteInfoStorage[spriteIndex]['spriteItem']);
    three_sprite_utils_vars.spriteInfoStorage.splice(spriteIndex, 1);
    // delete  three_sprite_utils_vars.spriteInfoStorage[spriteIndex];
    return null;
}
export function findSprite(attachedObject) {
    // var attachedObj_tmp;
    var spriteIndex = findSpriteIndex(attachedObject);
    if (spriteIndex == -1) return null;
    return three_sprite_utils_vars.spriteInfoStorage[spriteIndex]['spriteItem'];

    // return attachedObj_tmp;
}
export function findSpriteIndex(attachedObject) {
    var attachedObj_tmp;
    var flag = false;
    var i = -1;
    for (i = 0; i < three_sprite_utils_vars.spriteInfoStorage.length; i++) {
        var spriteInfo_tmp = three_sprite_utils_vars.spriteInfoStorage[i];
        attachedObj_tmp = spriteInfo_tmp['objItem'];
        if (attachedObj_tmp == attachedObject) {
            flag = true;
            break;
            return spriteInfo_tmp['spriteItem'];
        }
    }
    if (i == three_sprite_utils_vars.spriteInfoStorage.length) {
        return -1;
    }
    return i;
    // return attachedObj_tmp;
}
export function CreateSprite(str, _position, _obj) {
    var newSprite = makeTextSprite(str, { position: _position });
    var spriteInfoItem = { objItem: _obj, spriteItem: newSprite };
    three_sprite_utils_vars.spriteInfoStorage.push(spriteInfoItem);
    return newSprite;
}
export function makeTextSprite(message, parameters) {
    if (parameters === undefined) parameters = {};

    // var fontface = parameters.hasOwnProperty('fontface') ? parameters['fontface'] : 'Arial';

    // /* 字体大小 */
    // var fontsize = parameters.hasOwnProperty('fontsize') ? parameters['fontsize'] : 72;

    // /* 边框厚度 */
    // var borderThickness = parameters.hasOwnProperty('borderThickness') ? parameters['borderThickness'] : 5;

    // /* 边框颜色 */
    // var borderColor = parameters.hasOwnProperty('borderColor') ? parameters['borderColor'] : { r: 90, g: 90, b: 90, a: 1.0 };

    // /* 背景颜色 */
    // var backgroundColor = parameters.hasOwnProperty('backgroundColor') ? parameters['backgroundColor'] : { r: 255, g: 255, b: 255, a: 1.0 };

    // var position = parameters.hasOwnProperty('position') ? parameters['position'] : { x: 100, y: 100, z: 0 };

    // /* 创建画布 */
    // var canvas = document.createElement('canvas');
    // var context = canvas.getContext('2d');

    // /* 字体加粗 */
    // context.font = 'Bold ' + fontsize + 'px ' + fontface;

    // /* 获取文字的大小数据，高度取决于文字的大小 */
    // var metrics = context.measureText(message);
    // var textWidth = metrics.width;

    // /* 背景颜色 */
    // context.fillStyle = 'rgba(' + backgroundColor.r + ',' + backgroundColor.g + ',' + backgroundColor.b + ',' + backgroundColor.a + ')';

    // /* 边框的颜色 */
    // context.strokeStyle = 'rgba(' + borderColor.r + ',' + borderColor.g + ',' + borderColor.b + ',' + borderColor.a + ')';
    // context.lineWidth = borderThickness;

    // /* 绘制圆角矩形 */
    // roundRect(context, borderThickness / 2, borderThickness / 2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
    // // normRect(context, 0, 0, textWidth, fontsize)
    // /* 字体颜色 */
    // context.fillStyle = 'rgba(222, 111, 0, 1)';
    // context.fillText(message, borderThickness, fontsize + borderThickness);

    // /* 画布内容用于纹理贴图 */
    // var texture = new THREE.CanvasTexture(canvas);
    // texture.needsUpdate = true;

    // var spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    // var sprite = new THREE.Sprite(spriteMaterial);

    // console.log(sprite.spriteMaterial);

    // /* 缩放比例 */
    // sprite.position.set(position.x, position.y, position.z);
    // sprite.scale.set(1, 1, 1);

    // 可运行的demo1
    var position = parameters.hasOwnProperty('position') ? parameters['position'] : { x: 100, y: 100, z: 0 };

    let canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    canvas.id = message;
    canvas.style = 'position:fixed;';

    let canvas_ctx = canvas.getContext('2d');
    canvas_ctx.fillStyle = 'black';
    let txtWidth = canvas_ctx.measureText(message).width * 2 + 18;
    canvas_ctx.fillRect(20, 200, txtWidth, 30);
    canvas_ctx.font = '20px bold';
    canvas_ctx.fillStyle = '#ffffff';
    canvas_ctx.fillText(message, 28, 222);
    canvas_ctx.strokeStyle = 'black';
    canvas_ctx.moveTo(20, 230);
    canvas_ctx.lineTo(0, canvas.height);
    canvas_ctx.stroke();
    const map = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map: map
    });
    const sprite = new THREE.Sprite(material);
    sprite.center.set(0, 0);
    sprite.scale.set(2, 2, 1);
    sprite.position.set(position.x, position.y + 0.3, position.z);

    return sprite;
}
export function normRect(ctx, x, y, w, h) {
    ctx.beginPath();
    // ctx.moveTo(x, y);
    // ctx.lineTo(x, y - 2*h);
    // ctx.lineTo(x + 2*w, y - 2*h);
    // ctx.lineTo(x + 2*w, y);
    // ctx.lineTo(x, y);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 2 * h);
    ctx.lineTo(x - 2 * w, y + 2 * h);
    ctx.lineTo(x - 2 * w, y);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
    // ctx.stroke();
}
export function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}
