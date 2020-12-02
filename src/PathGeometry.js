import { PathPoint } from './PathPoint.js';

/**
 * PathGeometry
 */
var PathGeometry = function(maxVertex) {
	THREE.BufferGeometry.call(this);

	maxVertex = maxVertex || 3000;

	if (this.setAttribute) {
		this.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxVertex * 3), 3).setUsage(THREE.DynamicDrawUsage));
		this.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(maxVertex * 3), 3).setUsage(THREE.DynamicDrawUsage));
		this.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(maxVertex * 2), 2).setUsage(THREE.DynamicDrawUsage));
	} else {
		this.addAttribute('position', new THREE.BufferAttribute(new Float32Array(maxVertex * 3), 3).setDynamic(true));
		this.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(maxVertex * 3), 3).setDynamic(true));
		this.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(maxVertex * 2), 2).setDynamic(true));
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

		var count = 0;

		// modify data
		var position = [];
		var normal = [];
		var uv = [];
		var indices = [];
		var verticesCount = 0;

		var right = new THREE.Vector3();
		var left = new THREE.Vector3();

		// for sharp corners
		var leftOffset = new THREE.Vector3();
		var rightOffset = new THREE.Vector3();
		var tempPoint1 = new THREE.Vector3();
		var tempPoint2 = new THREE.Vector3();

		function addVertices(pathPoint, halfWidth, uvDist) {
			var first = position.length === 0;
			var sharpCorner = pathPoint.sharp && !first;

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

				let uvOffset = halfWidth / (side !== "both" ? width / 2 : width);

				uv.push(
					uvDist - uvOffset, 0,
					uvDist - uvOffset, 1,
					uvDist, 0,
					uvDist, 1,
					uvDist + uvOffset, 0,
					uvDist + uvOffset, 1
				);
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
		function addStart(pathPoint, halfWidth, uvDist) {
			var dir = pathPoint.dir;
			var up = pathPoint.up;
			var _right = pathPoint.right;

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
				uvDist + (halfWidth * 3 / (side !== "both" ? halfWidth : halfWidth * 2)), side !== "both" ? 0 : 0.5
			);

			verticesCount += 3;

			indices.push(
				verticesCount - 1, verticesCount - 3, verticesCount - 2
			);

			count += 3;
		}

		// build path geometry
		var totalDistance = pathPointList.distance();

		if (totalDistance == 0) {
			return 0;
		}

		var progressDistance = progress * totalDistance;
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

					addVertices(lastPoint, width / 2, lastPoint.dist / (side !== "both" ? width / 2 : width));
					break;
				} else {
					addVertices(pathPoint, width / 2, pathPoint.dist / (side !== "both" ? width / 2 : width));
				}
			}
		} else {
			lastPoint = pathPointList.array[0];
		}

		// build arrow geometry
		if (arrow) {
			lastPoint = lastPoint || pathPointList.array[pathPointList.count - 1];
			addStart(lastPoint, width / 2, lastPoint.dist / (side !== "both" ? width / 2 : width));
		}

		var positionAttribute = this.getAttribute('position');
		var normalAttribute = this.getAttribute('normal');
		var uvAttribute = this.getAttribute('uv');
		var indexAttribute = this.getIndex();

		this._resizeAttribute('position', positionAttribute, position.length);
		this._resizeAttribute('normal', normalAttribute, normal.length);
		this._resizeAttribute('uv', uvAttribute, uv.length);
		this._resizeIndex(indexAttribute, indices.length);

		positionAttribute = this.getAttribute('position');
		normalAttribute = this.getAttribute('normal');
		uvAttribute = this.getAttribute('uv');
		indexAttribute = this.getIndex();

		positionAttribute.array.set(position, 0);
		normalAttribute.array.set(normal, 0);
		uvAttribute.array.set(uv, 0);
		indexAttribute.set(indices, 0);

		positionAttribute.updateRange.count = position.length;
		normalAttribute.updateRange.count = normal.length;
		uvAttribute.updateRange.count = uv.length;
		indexAttribute.updateRange.count = indices.length;

		positionAttribute.needsUpdate = true;
		normalAttribute.needsUpdate = true;
		uvAttribute.needsUpdate = true;
		indexAttribute.needsUpdate = true;

		return count;
	}

});

export { PathGeometry };
