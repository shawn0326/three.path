// github.com/shawn0326/three.path
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.THREE = global.THREE || {}));
}(this, (function (exports) { 'use strict';

	/**
	 * PathPoint
	 */
	var PathPoint = /*#__PURE__*/function () {
		function PathPoint() {
			this.pos = new THREE.Vector3();
			this.dir = new THREE.Vector3();
			this.right = new THREE.Vector3();
			this.up = new THREE.Vector3(); // normal

			this.dist = 0; // distance from start

			this.widthScale = 1; // for corner

			this.sharp = false; // marks as sharp corner
		}

		var _proto = PathPoint.prototype;

		_proto.lerpPathPoints = function lerpPathPoints(p1, p2, alpha) {
			this.pos.lerpVectors(p1.pos, p2.pos, alpha);
			this.dir.lerpVectors(p1.dir, p2.dir, alpha);
			this.up.lerpVectors(p1.up, p2.up, alpha);
			this.right.lerpVectors(p1.right, p2.right, alpha);
			this.dist = (p2.dist - p1.dist) * alpha + p1.dist;
			this.widthScale = (p2.widthScale - p1.widthScale) * alpha + p1.widthScale;
		};

		_proto.copy = function copy(source) {
			this.pos.copy(source.pos);
			this.dir.copy(source.dir);
			this.up.copy(source.up);
			this.right.copy(source.right);
			this.dist = source.dist;
			this.widthScale = source.widthScale;
		};

		return PathPoint;
	}();

	var helpVec3_1 = new THREE.Vector3();
	var helpVec3_2 = new THREE.Vector3();
	var helpVec3_3 = new THREE.Vector3();
	var helpMat4 = new THREE.Matrix4();
	var helpCurve = new THREE.QuadraticBezierCurve3();

	function _getCornerBezierCurve(last, current, next, cornerRadius, out) {
		var lastDir = helpVec3_1.subVectors(current, last);
		var nextDir = helpVec3_2.subVectors(next, current);
		var lastDirLength = lastDir.length();
		var nextDirLength = nextDir.length();
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

		return out;
	}
	/**
	 * PathPointList
	 * input points to generate a PathPoint list
	 */


	var PathPointList = /*#__PURE__*/function () {
		function PathPointList() {
			this.array = []; // path point array

			this.count = 0;
		}
		/**
		 * Set points
		 * @param {THREE.Vector3[]} points key points array
		 * @param {number} cornerRadius? the corner radius. set 0 to disable round corner. default is 0.1
		 * @param {number} cornerSplit? the corner split. default is 10.
		 * @param {number} up? force up. default is auto up (calculate by tangent).
		 * @param {boolean} close? close path. default is false.
		 */


		var _proto = PathPointList.prototype;

		_proto.set = function set(points, cornerRadius, cornerSplit, up, close) {
			if (cornerRadius === void 0) {
				cornerRadius = 0.1;
			}

			if (cornerSplit === void 0) {
				cornerSplit = 10;
			}

			if (up === void 0) {
				up = null;
			}

			if (close === void 0) {
				close = false;
			}

			points = points.slice(0);

			if (points.length < 2) {
				console.warn("PathPointList: points length less than 2.");
				this.count = 0;
				return;
			} // Auto close


			if (close && !points[0].equals(points[points.length - 1])) {
				points.push(new THREE.Vector3().copy(points[0]));
			} // Generate path point list


			for (var i = 0, l = points.length; i < l; i++) {
				if (i === 0) {
					this._start(points[i], points[i + 1], up);
				} else if (i === l - 1) {
					if (close) {
						// Connect end point and start point
						this._corner(points[i], points[1], cornerRadius, cornerSplit, up); // Fix start point


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
		}
		/**
		 * Get distance of this path
		 * @return {number}
		 */
		;

		_proto.distance = function distance() {
			if (this.count > 0) {
				return this.array[this.count - 1].dist;
			}

			return 0;
		};

		_proto._getByIndex = function _getByIndex(index) {
			if (!this.array[index]) {
				this.array[index] = new PathPoint();
			}

			return this.array[index];
		};

		_proto._start = function _start(current, next, up) {
			this.count = 0;

			var point = this._getByIndex(this.count);

			point.pos.copy(current);
			point.dir.subVectors(next, current); // init start up dir

			if (up) {
				point.up.copy(up);
			} else {
				// select an initial normal vector perpendicular to the first tangent vector
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
			point.sharp = false;
			point.dir.normalize();
			this.count++;
		};

		_proto._end = function _end(current) {
			var lastPoint = this.array[this.count - 1];

			var point = this._getByIndex(this.count);

			point.pos.copy(current);
			point.dir.subVectors(current, lastPoint.pos);
			var dist = point.dir.length();
			point.dir.normalize();
			point.up.copy(lastPoint.up); // copy last up

			var vec = helpVec3_1.crossVectors(lastPoint.dir, point.dir);

			if (vec.length() > Number.EPSILON) {
				vec.normalize();
				var theta = Math.acos(Math.min(Math.max(lastPoint.dir.dot(point.dir), -1), 1)); // clamp for floating pt errors

				point.up.applyMatrix4(helpMat4.makeRotationAxis(vec, theta));
			}

			point.right.crossVectors(point.dir, point.up).normalize();
			point.dist = lastPoint.dist + dist;
			point.widthScale = 1;
			point.sharp = false;
			this.count++;
		};

		_proto._corner = function _corner(current, next, cornerRadius, cornerSplit, up) {
			if (cornerRadius > 0 && cornerSplit > 0) {
				var lastPoint = this.array[this.count - 1];

				var curve = _getCornerBezierCurve(lastPoint.pos, current, next, cornerRadius, helpCurve);

				var samplerPoints = curve.getPoints(cornerSplit); // TODO optimize

				for (var f = 0; f < cornerSplit; f++) {
					this._sharpCorner(samplerPoints[f], samplerPoints[f + 1], up, f === 0 ? 1 : 0);
				}

				if (!samplerPoints[cornerSplit].equals(next)) {
					this._sharpCorner(samplerPoints[cornerSplit], next, up, 2);
				}
			} else {
				this._sharpCorner(current, next, up, 0, true);
			}
		} // dirType: 0 - use middle dir / 1 - use last dir / 2- use next dir
		;

		_proto._sharpCorner = function _sharpCorner(current, next, up, dirType, sharp) {
			if (dirType === void 0) {
				dirType = 0;
			}

			if (sharp === void 0) {
				sharp = false;
			}

			var lastPoint = this.array[this.count - 1];

			var point = this._getByIndex(this.count);

			var lastDir = helpVec3_1.subVectors(current, lastPoint.pos);
			var nextDir = helpVec3_2.subVectors(next, current);
			var lastDirLength = lastDir.length();
			lastDir.normalize();
			nextDir.normalize();
			point.pos.copy(current);

			if (dirType === 1) {
				point.dir.copy(lastDir);
			} else if (dirType === 2) {
				point.dir.copy(nextDir);
			} else {
				point.dir.addVectors(lastDir, nextDir);
				point.dir.normalize();
			}

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

			point.widthScale = Math.min(1 / Math.sqrt((1 + _cos) / 2), 1.415) || 1;
			point.sharp = Math.abs(_cos - 1) > 0.05 && sharp;
			this.count++;
		};

		return PathPointList;
	}();

	function _inheritsLoose(subClass, superClass) {
		subClass.prototype = Object.create(superClass.prototype);
		subClass.prototype.constructor = subClass;

		_setPrototypeOf(subClass, superClass);
	}

	function _setPrototypeOf(o, p) {
		_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
			o.__proto__ = p;
			return o;
		};

		return _setPrototypeOf(o, p);
	}

	/**
	 * PathGeometry
	 */

	var PathGeometry = /*#__PURE__*/function (_THREE$BufferGeometry) {
		_inheritsLoose(PathGeometry, _THREE$BufferGeometry);

		function PathGeometry(maxVertex, generateUv2) {
			var _this;

			if (maxVertex === void 0) {
				maxVertex = 3000;
			}

			if (generateUv2 === void 0) {
				generateUv2 = false;
			}

			_this = _THREE$BufferGeometry.call(this) || this;

			_this.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxVertex * 3), 3).setUsage(THREE.DynamicDrawUsage));

			_this.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(maxVertex * 3), 3).setUsage(THREE.DynamicDrawUsage));

			_this.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(maxVertex * 2), 2).setUsage(THREE.DynamicDrawUsage));

			if (generateUv2) {
				_this.setAttribute('uv2', new THREE.BufferAttribute(new Float32Array(maxVertex * 2), 2).setUsage(THREE.DynamicDrawUsage));
			}

			_this.drawRange.start = 0;
			_this.drawRange.count = 0;

			_this.setIndex(new Array(maxVertex * 3));

			return _this;
		}
		/**
		 * Update geometry by PathPointList instance
		 * @param {PathPointList} pathPointList
		 * @param {Object} options
		 * @param {Number} [options.width=0.1]
		 * @param {Boolean} [options.arrow=true]
		 * @param {Number} [options.progress=1]
		 * @param {String} [options.side='both'] - "left"/"right"/"both"
		 */


		var _proto = PathGeometry.prototype;

		_proto.update = function update(pathPointList, options) {
			if (options === void 0) {
				options = {};
			}

			var count = this._updateAttributes(pathPointList, options);

			this.drawRange.count = count;
		};

		_proto._resizeAttribute = function _resizeAttribute(name, len) {
			var attribute = this.getAttribute(name);

			while (attribute.array.length < len) {
				var oldLength = attribute.array.length;
				var newAttribute = new THREE.BufferAttribute(new Float32Array(oldLength * 2), attribute.itemSize, attribute.normalized);
				newAttribute.name = attribute.name;
				newAttribute.usage = attribute.usage;
				this.setAttribute(name, newAttribute);
				attribute = newAttribute;
			}
		};

		_proto._resizeIndex = function _resizeIndex(len) {
			var index = this.getIndex();

			while (index.array.length < len) {
				var oldLength = index.array.length;
				var newIndex = new THREE.BufferAttribute(oldLength * 2 > 65535 ? new Uint32Array(oldLength * 2) : new Uint16Array(oldLength * 2), 1);
				newIndex.name = index.name;
				newIndex.usage = index.usage;
				this.setIndex(newIndex);
				index = newIndex;
			}
		};

		_proto._updateAttributes = function _updateAttributes(pathPointList, options) {
			var width = options.width || 0.1;
			var progress = options.progress !== undefined ? options.progress : 1;
			var arrow = options.arrow !== undefined ? options.arrow : true;
			var side = options.side !== undefined ? options.side : "both";
			var halfWidth = width / 2;
			var sideWidth = side !== "both" ? width / 2 : width;
			var totalDistance = pathPointList.distance();
			var progressDistance = progress * totalDistance;

			if (totalDistance == 0) {
				return 0;
			}

			var sharpUvOffset = halfWidth / sideWidth;
			var sharpUvOffset2 = halfWidth / totalDistance;
			var generateUv2 = !!this.getAttribute('uv2');
			var count = 0; // modify data

			var position = [];
			var normal = [];
			var uv = [];
			var uv2 = [];
			var indices = [];
			var verticesCount = 0;
			var right = new THREE.Vector3();
			var left = new THREE.Vector3(); // for sharp corners

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

					var _cos = tempPoint2.copy(longEdge).sub(tempPoint1).normalize().dot(dir);

					var _len = tempPoint2.copy(longEdge).sub(tempPoint1).length();

					var _dist = _cos * _len * 2;

					tempPoint2.copy(dir).setLength(_dist).add(tempPoint1);

					if (sideOffset > 0) {
						position.push(tempPoint1.x, tempPoint1.y, tempPoint1.z, // 6
						right.x, right.y, right.z, // 5
						left.x, left.y, left.z, // 4
						right.x, right.y, right.z, // 3
						tempPoint2.x, tempPoint2.y, tempPoint2.z, // 2
						right.x, right.y, right.z // 1
						);
						verticesCount += 6;
						indices.push(verticesCount - 6, verticesCount - 8, verticesCount - 7, verticesCount - 6, verticesCount - 7, verticesCount - 5, verticesCount - 4, verticesCount - 6, verticesCount - 5, verticesCount - 2, verticesCount - 4, verticesCount - 1);
						count += 12;
					} else {
						position.push(left.x, left.y, left.z, // 6
						tempPoint1.x, tempPoint1.y, tempPoint1.z, // 5
						left.x, left.y, left.z, // 4
						right.x, right.y, right.z, // 3
						left.x, left.y, left.z, // 2
						tempPoint2.x, tempPoint2.y, tempPoint2.z // 1
						);
						verticesCount += 6;
						indices.push(verticesCount - 6, verticesCount - 8, verticesCount - 7, verticesCount - 6, verticesCount - 7, verticesCount - 5, verticesCount - 6, verticesCount - 5, verticesCount - 3, verticesCount - 2, verticesCount - 3, verticesCount - 1);
						count += 12;
					}

					normal.push(up.x, up.y, up.z, up.x, up.y, up.z, up.x, up.y, up.z, up.x, up.y, up.z, up.x, up.y, up.z, up.x, up.y, up.z);
					uv.push(uvDist - sharpUvOffset, 0, uvDist - sharpUvOffset, 1, uvDist, 0, uvDist, 1, uvDist + sharpUvOffset, 0, uvDist + sharpUvOffset, 1);

					if (generateUv2) {
						uv2.push(uvDist2 - sharpUvOffset2, 0, uvDist2 - sharpUvOffset2, 1, uvDist2, 0, uvDist2, 1, uvDist2 + sharpUvOffset2, 0, uvDist2 + sharpUvOffset2, 1);
					}
				} else {
					position.push(left.x, left.y, left.z, right.x, right.y, right.z);
					normal.push(up.x, up.y, up.z, up.x, up.y, up.z);
					uv.push(uvDist, 0, uvDist, 1);

					if (generateUv2) {
						uv2.push(uvDist2, 0, uvDist2, 1);
					}

					verticesCount += 2;

					if (!first) {
						indices.push(verticesCount - 2, verticesCount - 4, verticesCount - 3, verticesCount - 2, verticesCount - 3, verticesCount - 1);
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
				position.push(left.x, left.y, left.z, right.x, right.y, right.z, sharp.x, sharp.y, sharp.z);
				normal.push(up.x, up.y, up.z, up.x, up.y, up.z, up.x, up.y, up.z);
				uv.push(uvDist, side !== "both" ? side !== "right" ? -2 : 0 : -0.5, uvDist, side !== "both" ? side !== "left" ? 2 : 0 : 1.5, uvDist + 1.5, side !== "both" ? 0 : 0.5);

				if (generateUv2) {
					uv2.push(uvDist2, side !== "both" ? side !== "right" ? -2 : 0 : -0.5, uvDist2, side !== "both" ? side !== "left" ? 2 : 0 : 1.5, uvDist2 + 1.5 * width / totalDistance, side !== "both" ? 0 : 0.5);
				}

				verticesCount += 3;
				indices.push(verticesCount - 1, verticesCount - 3, verticesCount - 2);
				count += 3;
			}

			var lastPoint;

			if (progressDistance > 0) {
				for (var i = 0; i < pathPointList.count; i++) {
					var pathPoint = pathPointList.array[i];

					if (pathPoint.dist > progressDistance) {
						var prevPoint = pathPointList.array[i - 1];
						lastPoint = new PathPoint(); // linear lerp for progress

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
			} // build arrow geometry


			if (arrow) {
				lastPoint = lastPoint || pathPointList.array[pathPointList.count - 1];
				addStart(lastPoint);
			}

			this._resizeAttribute('position', position.length);

			var positionAttribute = this.getAttribute('position');
			positionAttribute.array.set(position, 0);
			positionAttribute.updateRange.count = position.length;
			positionAttribute.needsUpdate = true;

			this._resizeAttribute('normal', normal.length);

			var normalAttribute = this.getAttribute('normal');
			normalAttribute.array.set(normal, 0);
			normalAttribute.updateRange.count = normal.length;
			normalAttribute.needsUpdate = true;

			this._resizeAttribute('uv', uv.length);

			var uvAttribute = this.getAttribute('uv');
			uvAttribute.array.set(uv, 0);
			uvAttribute.updateRange.count = uv.length;
			uvAttribute.needsUpdate = true;

			if (generateUv2) {
				this._resizeAttribute('uv2', uv2.length);

				var uv2Attribute = this.getAttribute('uv2');
				uv2Attribute.array.set(uv2, 0);
				uv2Attribute.updateRange.count = uv2.length;
				uv2Attribute.needsUpdate = true;
			}

			this._resizeIndex(indices.length);

			var indexAttribute = this.getIndex();
			indexAttribute.set(indices, 0);
			indexAttribute.updateRange.count = indices.length;
			indexAttribute.needsUpdate = true;
			return count;
		};

		return PathGeometry;
	}(THREE.BufferGeometry);

	/**
	 * PathTubeGeometry
	 */

	var PathTubeGeometry = function PathTubeGeometry(maxVertex, generateUv2) {
		PathGeometry.call(this, maxVertex || 1000, generateUv2);
	};

	PathTubeGeometry.prototype = Object.assign(Object.create(PathGeometry.prototype), {
		constructor: PathTubeGeometry,
		_updateAttributes: function _updateAttributes(pathPointList, options) {
			var radius = options.radius || 0.1;
			var radialSegments = Math.max(2, options.radialSegments || 8);
			var startRad = options.startRad || 0;
			var progress = options.progress !== undefined ? options.progress : 1;
			var circum = radius * 2 * Math.PI;
			var totalDistance = pathPointList.distance();
			var progressDistance = progress * totalDistance;

			if (progressDistance == 0) {
				return 0;
			}

			var generateUv2 = !!this.getAttribute('uv2');
			var count = 0; // modify data

			var position = [];
			var normal = [];
			var uv = [];
			var uv2 = [];
			var indices = [];
			var verticesCount = 0;
			var normalDir = new THREE.Vector3();

			function addVertices(pathPoint, radius, radialSegments) {
				var first = position.length === 0;
				var uvDist = pathPoint.dist / circum;
				var uvDist2 = pathPoint.dist / totalDistance;

				for (var r = 0; r <= radialSegments; r++) {
					var _r = r;

					if (_r == radialSegments) {
						_r = 0;
					}

					normalDir.copy(pathPoint.up).applyAxisAngle(pathPoint.dir, startRad + Math.PI * 2 * _r / radialSegments).normalize();
					position.push(pathPoint.pos.x + normalDir.x * radius * pathPoint.widthScale, pathPoint.pos.y + normalDir.y * radius * pathPoint.widthScale, pathPoint.pos.z + normalDir.z * radius * pathPoint.widthScale);
					normal.push(normalDir.x, normalDir.y, normalDir.z);
					uv.push(uvDist, r / radialSegments);

					if (generateUv2) {
						uv2.push(uvDist2, r / radialSegments);
					}

					verticesCount++;
				}

				if (!first) {
					var begin1 = verticesCount - (radialSegments + 1) * 2;
					var begin2 = verticesCount - (radialSegments + 1);

					for (var i = 0; i < radialSegments; i++) {
						indices.push(begin2 + i, begin1 + i, begin1 + i + 1, begin2 + i, begin1 + i + 1, begin2 + i + 1);
						count += 6;
					}
				}
			}

			if (progressDistance > 0) {
				for (var i = 0; i < pathPointList.count; i++) {
					var pathPoint = pathPointList.array[i];

					if (pathPoint.dist > progressDistance) {
						var prevPoint = pathPointList.array[i - 1];
						var lastPoint = new PathPoint(); // linear lerp for progress

						var alpha = (progressDistance - prevPoint.dist) / (pathPoint.dist - prevPoint.dist);
						lastPoint.lerpPathPoints(prevPoint, pathPoint, alpha);
						addVertices(lastPoint, radius, radialSegments);
						break;
					} else {
						addVertices(pathPoint, radius, radialSegments);
					}
				}
			}

			this._resizeAttribute('position', position.length);

			var positionAttribute = this.getAttribute('position');
			positionAttribute.array.set(position, 0);
			positionAttribute.updateRange.count = position.length;
			positionAttribute.needsUpdate = true;

			this._resizeAttribute('normal', normal.length);

			var normalAttribute = this.getAttribute('normal');
			normalAttribute.array.set(normal, 0);
			normalAttribute.updateRange.count = normal.length;
			normalAttribute.needsUpdate = true;

			this._resizeAttribute('uv', uv.length);

			var uvAttribute = this.getAttribute('uv');
			uvAttribute.array.set(uv, 0);
			uvAttribute.updateRange.count = uv.length;
			uvAttribute.needsUpdate = true;

			if (generateUv2) {
				this._resizeAttribute('uv2', uv2.length);

				var uv2Attribute = this.getAttribute('uv2');
				uv2Attribute.array.set(uv2, 0);
				uv2Attribute.updateRange.count = uv2.length;
				uv2Attribute.needsUpdate = true;
			}

			this._resizeIndex(indices.length);

			var indexAttribute = this.getIndex();
			indexAttribute.set(indices, 0);
			indexAttribute.updateRange.count = indices.length;
			indexAttribute.needsUpdate = true;
			return count;
		}
	});

	exports.PathGeometry = PathGeometry;
	exports.PathPointList = PathPointList;
	exports.PathTubeGeometry = PathTubeGeometry;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
