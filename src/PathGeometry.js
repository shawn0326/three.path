import { PathPoint } from './PathPoint.js';

/**
 * PathGeometry
 */
var PathGeometry = function(maxVertex, generateUv2) {
	THREE.BufferGeometry.call(this);

	maxVertex = maxVertex || 3000;

	if (this.setAttribute) {
		this.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxVertex * 3), 3).setUsage(THREE.DynamicDrawUsage));
		this.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(maxVertex * 3), 3).setUsage(THREE.DynamicDrawUsage));
		this.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(maxVertex * 2), 2).setUsage(THREE.DynamicDrawUsage));
		if (generateUv2) {
			this.setAttribute('uv2', new THREE.BufferAttribute(new Float32Array(maxVertex * 2), 2).setUsage(THREE.DynamicDrawUsage));
		}
	} else { // for old three.js
		this.addAttribute('position', new THREE.BufferAttribute(new Float32Array(maxVertex * 3), 3).setDynamic(true));
		this.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(maxVertex * 3), 3).setDynamic(true));
		this.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(maxVertex * 2), 2).setDynamic(true));
		if (generateUv2) {
			this.addAttribute('uv2', new THREE.BufferAttribute(new Float32Array(maxVertex * 2), 2).setDynamic(true));
		}
	}

	this.drawRange.start = 0;
	this.drawRange.count = 0;

	this.setIndex(new Array(maxVertex * 3));
}

PathGeometry.prototype = Object.assign(Object.create(THREE.BufferGeometry.prototype), {

	constructor: PathGeometry,

	/**
	 * update geometry by PathPointList instance
	 * @param {PathPointList} pathPointList
	 * @param {Object} options
	 */
	update: function(pathPointList, options) {
		// update attributes
		options = options || {};
		var count = this._updateAttributes(pathPointList, options);

		this.drawRange.count = count;
	},

	_resizeAttribute: function(name, attribute, len) {
		while (attribute.array.length < len) {
			var oldLength = attribute.array.length;
			var newAttribute = new THREE.BufferAttribute(
				new Float32Array(oldLength * 2),
				attribute.itemSize,
				attribute.normalized
			);
			newAttribute.name = attribute.name;
			newAttribute.usage = attribute.usage;
			if (this.setAttribute) {
				this.setAttribute(name, newAttribute);
			} else {
				this.addAttribute(name, newAttribute);
			}
			attribute = newAttribute;
		}
	},

	_resizeIndex: function(index, len) {
		while (index.array.length < len) {
			var oldLength = index.array.length;
			var newIndex = new THREE.BufferAttribute(
				oldLength * 2 > 65535 ? new Uint32Array(oldLength * 2) : new Uint16Array(oldLength * 2),
				1
			);
			newIndex.name = index.name;
			newIndex.usage = index.usage;
			this.setIndex(newIndex);
			index = newIndex;
		}
	},

	_updateAttributes: function(pathPointList, options) {
		var width = options.width || 0.1;
		var progress = options.progress !== undefined ? options.progress : 1;
		var arrow = options.arrow !== undefined ? options.arrow : true;
		var side = options.side !== undefined ? options.side : "both";

		var halfWidth = width / 2;
		var sideWidth = (side !== "both" ? width / 2 : width);
		var totalDistance = pathPointList.distance();
		var progressDistance = progress * totalDistance;
		if (totalDistance == 0) {
			return 0;
		}
		var sharpUvOffset = halfWidth / sideWidth;
		var sharpUvOffset2 = halfWidth / totalDistance;

		var generateUv2 = !!this.getAttribute('uv2');

		var count = 0;

		// modify data
		var position = [];
		var normal = [];
		var uv = [];
		var uv2 = [];
		var indices = [];
		var verticesCount = 0;

		var right = new THREE.Vector3();
		var left = new THREE.Vector3();

		// for sharp corners
		var leftOffset = new THREE.Vector3();
		var rightOffset = new THREE.Vector3();
		var tempPoint1 = new THREE.Vector3();
		var tempPoint2 = new THREE.Vector3();

		function addVertices(pathPoint) {
			var first = position.length === 0;
			var sharpCorner = pathPoint.sharp && !first;

			var uvDist = pathPoint.dist / sideWidth;
			var uvDist2 = pathPoint.dist / totalDistance;

			var dir = pathPoint.dir;
			var up = pathPoint.up;
			var _right = pathPoint.right;

			if (side !== "left") {
				right.copy(_right).multiplyScalar(halfWidth * pathPoint.widthScale);
			} else {
				right.set(0, 0, 0);
			}

			if (side !== "right") {
				left.copy(_right).multiplyScalar(-halfWidth * pathPoint.widthScale);
			} else {
				left.set(0, 0, 0);
			}

			right.add(pathPoint.pos);
			left.add(pathPoint.pos);

			if (sharpCorner) {
				leftOffset.fromArray(position, position.length - 6).sub(left);
				rightOffset.fromArray(position, position.length - 3).sub(right);

				var leftDist = leftOffset.length();
				var rightDist = rightOffset.length();

				var sideOffset = leftDist - rightDist;
				var longerOffset, longEdge;

				if (sideOffset > 0) {
					longerOffset = leftOffset;
					longEdge = left;
				} else {
					longerOffset = rightOffset;
					longEdge = right;
				}

				tempPoint1.copy(longerOffset).setLength(Math.abs(sideOffset)).add(longEdge);

				let _cos = tempPoint2.copy(longEdge).sub(tempPoint1).normalize().dot(dir);
				let _len = tempPoint2.copy(longEdge).sub(tempPoint1).length();
				let _dist = _cos * _len * 2;

				tempPoint2.copy(dir).setLength(_dist).add(tempPoint1);

				if (sideOffset > 0) {
					position.push(
						tempPoint1.x, tempPoint1.y, tempPoint1.z, // 6
						right.x, right.y, right.z, // 5
						left.x, left.y, left.z, // 4
						right.x, right.y, right.z, // 3
						tempPoint2.x, tempPoint2.y, tempPoint2.z, // 2
						right.x, right.y, right.z // 1
					);

					verticesCount += 6;

					indices.push(
						verticesCount - 6, verticesCount - 8, verticesCount - 7,
						verticesCount - 6, verticesCount - 7, verticesCount - 5,

						verticesCount - 4, verticesCount - 6, verticesCount - 5,
						verticesCount - 2, verticesCount - 4, verticesCount - 1
					);

					count += 12;
				} else {
					position.push(
						left.x, left.y, left.z, // 6
						tempPoint1.x, tempPoint1.y, tempPoint1.z, // 5
						left.x, left.y, left.z, // 4
						right.x, right.y, right.z, // 3
						left.x, left.y, left.z, // 2
						tempPoint2.x, tempPoint2.y, tempPoint2.z // 1
					);

					verticesCount += 6;

					indices.push(
						verticesCount - 6, verticesCount - 8, verticesCount - 7,
						verticesCount - 6, verticesCount - 7, verticesCount - 5,

						verticesCount - 6, verticesCount - 5, verticesCount - 3,
						verticesCount - 2, verticesCount - 3, verticesCount - 1
					);

					count += 12;
				}

				normal.push(
					up.x, up.y, up.z,
					up.x, up.y, up.z,
					up.x, up.y, up.z,
					up.x, up.y, up.z,
					up.x, up.y, up.z,
					up.x, up.y, up.z
				);

				uv.push(
					uvDist - sharpUvOffset, 0,
					uvDist - sharpUvOffset, 1,
					uvDist, 0,
					uvDist, 1,
					uvDist + sharpUvOffset, 0,
					uvDist + sharpUvOffset, 1
				);

				if (generateUv2) {
					uv2.push(
						uvDist2 - sharpUvOffset2, 0,
						uvDist2 - sharpUvOffset2, 1,
						uvDist2, 0,
						uvDist2, 1,
						uvDist2 + sharpUvOffset2, 0,
						uvDist2 + sharpUvOffset2, 1
					);
				}
			} else {
				position.push(
					left.x, left.y, left.z,
					right.x, right.y, right.z
				);

				normal.push(
					up.x, up.y, up.z,
					up.x, up.y, up.z
				);

				uv.push(
					uvDist, 0,
					uvDist, 1
				);

				if (generateUv2) {
					uv2.push(
						uvDist2, 0,
						uvDist2, 1
					);
				}

				verticesCount += 2;

				if (!first) {
					indices.push(
						verticesCount - 2, verticesCount - 4, verticesCount - 3,
						verticesCount - 2, verticesCount - 3, verticesCount - 1
					);

					count += 6;
				}
			}
		}

		var sharp = new THREE.Vector3();
		function addStart(pathPoint) {
			var dir = pathPoint.dir;
			var up = pathPoint.up;
			var _right = pathPoint.right;

			var uvDist = pathPoint.dist / sideWidth;
			var uvDist2 = pathPoint.dist / totalDistance;

			if (side !== "left") {
				right.copy(_right).multiplyScalar(halfWidth * 2);
			} else {
				right.set(0, 0, 0);
			}

			if (side !== "right") {
				left.copy(_right).multiplyScalar(-halfWidth * 2);
			} else {
				left.set(0, 0, 0);
			}

			sharp.copy(dir).setLength(halfWidth * 3);

			right.add(pathPoint.pos);
			left.add(pathPoint.pos);
			sharp.add(pathPoint.pos);

			position.push(
				left.x, left.y, left.z,
				right.x, right.y, right.z,
				sharp.x, sharp.y, sharp.z
			);

			normal.push(
				up.x, up.y, up.z,
				up.x, up.y, up.z,
				up.x, up.y, up.z
			);

			uv.push(
				uvDist, side !== "both" ? (side !== "right" ? -2 : 0) : -0.5,
				uvDist, side !== "both" ? (side !== "left" ? 2 : 0) : 1.5,
				uvDist + 1.5, side !== "both" ? 0 : 0.5
			);

			if (generateUv2) {
				uv2.push(
					uvDist2, side !== "both" ? (side !== "right" ? -2 : 0) : -0.5,
					uvDist2, side !== "both" ? (side !== "left" ? 2 : 0) : 1.5,
					uvDist2 + (1.5 * width / totalDistance), side !== "both" ? 0 : 0.5
				);
			}

			verticesCount += 3;

			indices.push(
				verticesCount - 1, verticesCount - 3, verticesCount - 2
			);

			count += 3;
		}

		var lastPoint;

		if (progressDistance > 0) {
			for (var i = 0; i < pathPointList.count; i++) {
				var pathPoint = pathPointList.array[i];

				if (pathPoint.dist > progressDistance) {
					var prevPoint =  pathPointList.array[i - 1];
					lastPoint = new PathPoint();

					// linear lerp for progress
					var alpha = (progressDistance - prevPoint.dist) / (pathPoint.dist - prevPoint.dist);
					lastPoint.lerpPathPoints(prevPoint, pathPoint, alpha);

					addVertices(lastPoint);
					break;
				} else {
					addVertices(pathPoint);
				}
			}
		} else {
			lastPoint = pathPointList.array[0];
		}

		// build arrow geometry
		if (arrow) {
			lastPoint = lastPoint || pathPointList.array[pathPointList.count - 1];
			addStart(lastPoint);
		}

		var positionAttribute = this.getAttribute('position');
		this._resizeAttribute('position', positionAttribute, position.length);
		positionAttribute = this.getAttribute('position');
		positionAttribute.array.set(position, 0);
		positionAttribute.updateRange.count = position.length;
		positionAttribute.needsUpdate = true;

		var normalAttribute = this.getAttribute('normal');
		this._resizeAttribute('normal', normalAttribute, normal.length);
		normalAttribute = this.getAttribute('normal');
		normalAttribute.array.set(normal, 0);
		normalAttribute.updateRange.count = normal.length;
		normalAttribute.needsUpdate = true;

		var uvAttribute = this.getAttribute('uv');
		this._resizeAttribute('uv', uvAttribute, uv.length);
		uvAttribute = this.getAttribute('uv');
		uvAttribute.array.set(uv, 0);
		uvAttribute.updateRange.count = uv.length;
		uvAttribute.needsUpdate = true;

		if (generateUv2) {
			var uv2Attribute = this.getAttribute('uv2');
			this._resizeAttribute('uv2', uv2Attribute, uv2.length);
			uv2Attribute = this.getAttribute('uv2');
			uv2Attribute.array.set(uv2, 0);
			uv2Attribute.updateRange.count = uv2.length;
			uv2Attribute.needsUpdate = true;
		}

		var indexAttribute = this.getIndex();
		this._resizeIndex(indexAttribute, indices.length);
		indexAttribute = this.getIndex();
		indexAttribute.set(indices, 0);
		indexAttribute.updateRange.count = indices.length;
		indexAttribute.needsUpdate = true;

		return count;
	}

});

export { PathGeometry };
