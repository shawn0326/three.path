/* https://github.com/shawn0326/three.path */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.THREE = global.THREE || {})));
}(this, (function (exports) { 'use strict';

	/**
	 * PathPoint
	 */
	var PathPoint = function() {
		this.pos = new THREE.Vector3();

		this.dir = new THREE.Vector3();

		this.right = new THREE.Vector3();

		this.up = new THREE.Vector3(); // normal

		this.dist = 0; // distance from start

		this.widthScale = 1;
	};

	PathPoint.prototype.lerpPathPoints = function(p1, p2, alpha) {
		this.pos.lerpVectors(p1.pos, p2.pos, alpha);
		this.dir.lerpVectors(p1.dir, p2.dir, alpha);
		this.up.lerpVectors(p1.up, p2.up, alpha);
		this.right.lerpVectors(p1.right, p2.right, alpha);
		this.dist = (p2.dist - p1.dist) * alpha + p1.dist;
		this.widthScale = (p2.widthScale - p1.widthScale) * alpha + p1.widthScale;
	};

	PathPoint.prototype.copy = function(source) {
		this.pos.copy(source.pos);
		this.dir.copy(source.dir);
		this.up.copy(source.up);
		this.right.copy(source.right);
		this.dist = source.dist;
		this.widthScale = source.widthScale;
	};

	/**
	 * PathPointList
	 * input points to generate a PathPoint list
	 */
	var PathPointList = function() {
		this.array = []; // path point array
		this.count = 0;
	};

	/**
	 * set points
	 * @param {THREE.Vector3[]} points key points array
	 * @param {number} cornerRadius? the corner radius. set 0 to disable round corner. default is 0.1
	 * @param {number} cornerSplit? the corner split. default is 10.
	 * @param {number} up? force up. default is auto up (calculate by tangent).
	 * @param {boolean} close? close path. default is false.
	 */
	PathPointList.prototype.set = function(points, cornerRadius, cornerSplit, up, close) {
		points = points.slice(0);

		if (points.length < 2) {
			this.count = 0;
			console.warn("PathPointList: points length less than 2.");
			return;
		}

		cornerRadius = cornerRadius !== undefined ? cornerRadius : 0.1;
		cornerSplit = cornerSplit !== undefined ? cornerSplit : 10;
		close = close !== undefined ? close : false;

		if (close && !points[0].equals(points[points.length - 1])) {
			points.push(new THREE.Vector3().copy(points[0]));
		}

		for (var i = 0, l = points.length; i < l; i++) {
			if (i === 0) {
				this._start(points[i], points[i + 1], up);
			} else if (i === l - 1) {
				if (close) {
					this._corner(points[i], points[1], cornerRadius, cornerSplit, up);
					// fix start
					var dist = this.array[0].dist; // should not copy dist
					this.array[0].copy(this.array[this.count - 1]);
					this.array[0].dist = dist;
				} else {
					this._end(points[i]);
				}
			} else {
				this._corner(points[i], points[i + 1], cornerRadius, cornerSplit, up);
			}
		}
	};

	/**
	 * get distance of this path
	 * @return {number} distance
	 */
	PathPointList.prototype.distance = function() {
		if (this.count == 0) {
			return 0;
		} else {
			return this.array[this.count - 1].dist;
		}
	};

	PathPointList.prototype._start = function(current, next, up) {
		this.count = 0;

		var point = this._getByIndex(this.count);

		point.pos.copy(current);
		point.dir.subVectors(next, current);

		// init start up dir
		if (up) {
			point.up.copy(up);
		} else {
			var min = Number.MAX_VALUE;
			var tx = Math.abs(point.dir.x);
			var ty = Math.abs(point.dir.y);
			var tz = Math.abs(point.dir.z);
			if (tx < min) {
				min = tx;
				point.up.set(1, 0, 0);
			}
			if (ty < min) {
				min = ty;
				point.up.set(0, 1, 0);
			}
			if (tz < min) {
				point.up.set(0, 0, 1);
			}
		}

		point.right.crossVectors(point.dir, point.up).normalize();
		point.up.crossVectors(point.right, point.dir).normalize();
		point.dist = 0;
		point.widthScale = 1;

		point.dir.normalize();

		this.count++;
	};

	var helpVec3_1 = new THREE.Vector3();
	var helpVec3_2 = new THREE.Vector3();
	var helpVec3_3 = new THREE.Vector3();
	var helpMat4 = new THREE.Matrix4();
	var helpCurve = new THREE.QuadraticBezierCurve3();

	PathPointList.prototype._corner = function(current, next, cornerRadius, cornerSplit, up) {
		if (cornerRadius > 0 && cornerSplit > 0) {
			var lastPoint = this.array[this.count - 1];
			var curve = this._getCornerBezierCurve(lastPoint.pos, current, next, cornerRadius, helpCurve);
			var samplerPoints = curve.getPoints(cornerSplit); // TODO optimize

			for (var f = 0; f < cornerSplit; f += 1) {
				this._hardCorner(samplerPoints[f], samplerPoints[f + 1], up);
			}

			if (!samplerPoints[cornerSplit].equals(next)) {
				this._hardCorner(samplerPoints[cornerSplit], next, up);
			}
		} else {
			this._hardCorner(current, next, up);
		}
	};

	PathPointList.prototype._hardCorner = function(current, next, up) {
		var lastPoint = this.array[this.count - 1];
		var point = this._getByIndex(this.count);

		var lastDir = helpVec3_1.subVectors(current, lastPoint.pos);
		var nextDir = helpVec3_2.subVectors(next, current);

		var lastDirLength = lastDir.length();

		lastDir.normalize();
		nextDir.normalize();

		point.pos.copy(current);
		point.dir.addVectors(lastDir, nextDir);
		point.dir.normalize();

		if (up) {
			if (point.dir.dot(up) === 1) {
				point.right.crossVectors(nextDir, up).normalize();
			} else {
				point.right.crossVectors(point.dir, up).normalize();
			}

			point.up.crossVectors(point.right, point.dir).normalize();
		} else {
			point.up.copy(lastPoint.up);
			var vec = helpVec3_3.crossVectors(lastPoint.dir, point.dir);
			if (vec.length() > Number.EPSILON) {
				vec.normalize();
				var theta = Math.acos(Math.min(Math.max(lastPoint.dir.dot(point.dir), -1), 1)); // clamp for floating pt errors
				point.up.applyMatrix4(helpMat4.makeRotationAxis(vec, theta));
			}

			point.right.crossVectors(point.dir, point.up).normalize();
		}

		point.dist = lastPoint.dist + lastDirLength;

		var _cos = lastDir.dot(nextDir);
		point.widthScale = Math.min(1 / Math.sqrt((1 + _cos) / 2), 1.414213562373) || 1;

		// for sharp corner
		// if(point.widthScale > 1.414213562373) {
		//     var offsetDist = (point.widthScale - 1.414213562373) / 2;
		//     var offset = helpVec3_3.copy(lastDir).multiplyScalar( -1 ).add( nextDir ).normalize().multiplyScalar( offsetDist );
		//     point.pos.add(offset);
		// }

		this.count++;
	};

	PathPointList.prototype._end = function(current) {
		var lastPoint = this.array[this.count - 1];
		var point = this._getByIndex(this.count);

		point.pos.copy(current);
		point.dir.subVectors(current, lastPoint.pos);
		var dist = point.dir.length();
		point.dir.normalize();

		point.up.copy(lastPoint.up);
		var vec = helpVec3_1.crossVectors(lastPoint.dir, point.dir);
		if (vec.length() > Number.EPSILON) {
			vec.normalize();
			var theta = Math.acos(Math.min(Math.max(lastPoint.dir.dot(point.dir), -1), 1)); // clamp for floating pt errors
			point.up.applyMatrix4(helpMat4.makeRotationAxis(vec, theta));
		}

		point.right.crossVectors(point.dir, point.up).normalize();

		point.dist = lastPoint.dist + dist;
		point.widthScale = 1;

		this.count++;
	};

	PathPointList.prototype._getByIndex = function(index) {
		if (!this.array[index]) {
			this.array[index] = new PathPoint();
		}
		return this.array[index];
	};

	PathPointList.prototype._getCornerBezierCurve = function(last, current, next, cornerRadius, out) {
		var lastDir = helpVec3_1.subVectors(current, last);
		var nextDir = helpVec3_2.subVectors(next, current);

		var lastDirLength = lastDir.length();
		var nextDirLength = nextDir.length();
		// var lastCornerRadius = Math.min(lastDir.length(), cornerRadius);
		// var nextCornerRadius = Math.min(nextDir.length(), cornerRadius);

		lastDir.normalize();
		nextDir.normalize();

		if (lastDirLength > cornerRadius) {
			out.v0.copy(current).sub(lastDir.multiplyScalar(cornerRadius));
		} else {
			out.v0.copy(last);
		}

		out.v1.copy(current);

		if (nextDirLength > cornerRadius) {
			out.v2.copy(current).add(nextDir.multiplyScalar(cornerRadius));
		} else {
			out.v2.copy(next);
		}
		// out.v2.copy(current).add(nextDir.multiplyScalar(nextCornerRadius));

		return out;
	};

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

		this.setIndex(new Array(maxVertex * 2));
	};

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
			function addVertices(pathPoint, halfWidth, uvDist) {
				var first = position.length === 0;

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

				// TODO calculate up dir

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

	/**
	 * PathTubeGeometry
	 */
	var PathTubeGeometry = function(maxVertex) {
		PathGeometry.call(this, maxVertex || 1000);
	};

	PathTubeGeometry.prototype = Object.assign(Object.create(PathGeometry.prototype), {

		constructor: PathTubeGeometry,

		_updateAttributes: function(pathPointList, options) {
			var radius = options.radius || 0.1;
			var radialSegments = Math.max(2, options.radialSegments || 8);
			var startRad = options.startRad || 0;
			var progress = options.progress !== undefined ? options.progress : 1;

			var count = 0;

			// modify data
			var position = [];
			var normal = [];
			var uv = [];
			var indices = [];
			var verticesCount = 0;

			var normalDir = new THREE.Vector3();
			function addVertices(pathPoint, radius, radialSegments, uvDist) {
				var first = position.length === 0;

				for (var r = 0; r <= radialSegments; r++) {
					var _r = r;
					if (_r == radialSegments) {
						_r = 0;
					}
					normalDir.copy(pathPoint.up).applyAxisAngle(pathPoint.dir, startRad + Math.PI * 2 * _r / radialSegments).normalize();

					position.push(pathPoint.pos.x + normalDir.x * radius * pathPoint.widthScale, pathPoint.pos.y + normalDir.y * radius * pathPoint.widthScale, pathPoint.pos.z + normalDir.z * radius * pathPoint.widthScale);
					normal.push(normalDir.x, normalDir.y, normalDir.z);
					uv.push(uvDist, r / radialSegments);

					verticesCount++;
				}

				if (!first) {
					var begin1 = verticesCount - (radialSegments + 1) * 2;
					var begin2 = verticesCount - (radialSegments + 1);

					for (var i = 0; i < radialSegments; i++) {
						indices.push(
							begin2 + i, begin1 + i, begin1 + i + 1,
							begin2 + i, begin1 + i + 1, begin2 + i + 1
						);

						count += 6;
					}
				}
			}

			// build path geometry
			var totalDistance = pathPointList.distance();
			var progressDistance = progress * totalDistance;

			if (progressDistance == 0) {
				return 0;
			}

			if (progressDistance > 0) {
				for (var i = 0; i < pathPointList.count; i++) {
					var pathPoint = pathPointList.array[i];

					if (pathPoint.dist > progressDistance) {
						var prevPoint =  pathPointList.array[i - 1];
						var lastPoint = new PathPoint();

						// linear lerp for progress
						var alpha = (progressDistance - prevPoint.dist) / (pathPoint.dist - prevPoint.dist);
						lastPoint.lerpPathPoints(prevPoint, pathPoint, alpha);

						addVertices(lastPoint, radius, radialSegments, lastPoint.dist / (radius * 2 * Math.PI));
						break;
					} else {
						addVertices(pathPoint, radius, radialSegments, pathPoint.dist / (radius * 2 * Math.PI));
					}
				}
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

	exports.PathPointList = PathPointList;
	exports.PathGeometry = PathGeometry;
	exports.PathTubeGeometry = PathTubeGeometry;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
