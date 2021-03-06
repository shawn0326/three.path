import { PathPoint } from './PathPoint.js';

/**
 * PathPointList
 * input points to generate a PathPoint list
 */
var PathPointList = function() {
	this.array = []; // path point array
	this.count = 0;
}

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
}

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
}

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
	point.sharp = false;

	point.dir.normalize();

	this.count++;
}

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
			this._sharpCorner(samplerPoints[f], samplerPoints[f + 1], up, f === 0 ? 1 : 0);
		}

		if (!samplerPoints[cornerSplit].equals(next)) {
			this._sharpCorner(samplerPoints[cornerSplit], next, up, 2);
		}
	} else {
		this._sharpCorner(current, next, up, 0, true);
	}
}

// dirType: 0 - use middle dir / 1 - use last dir / 2- use next dir
PathPointList.prototype._sharpCorner = function(current, next, up, dirType, sharp) {
	var lastPoint = this.array[this.count - 1];
	var point = this._getByIndex(this.count);

	var lastDir = helpVec3_1.subVectors(current, lastPoint.pos);
	var nextDir = helpVec3_2.subVectors(next, current);

	var lastDirLength = lastDir.length();

	lastDir.normalize();
	nextDir.normalize();

	point.pos.copy(current);

	if (dirType) {
		if (dirType === 1) {
			point.dir.copy(lastDir);
		} else if (dirType === 2) {
			point.dir.copy(nextDir);
		}
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
	point.sharp = (Math.abs(_cos - 1) > 0.05) && sharp;
	// point.sharp = sharp || false;

	// for sharp corner
	// if(point.widthScale > 1.414213562373) {
	//     var offsetDist = (point.widthScale - 1.414213562373) / 2;
	//     var offset = helpVec3_3.copy(lastDir).multiplyScalar( -1 ).add( nextDir ).normalize().multiplyScalar( offsetDist );
	//     point.pos.add(offset);
	// }

	this.count++;
}

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
	point.sharp = false;

	this.count++;
}

PathPointList.prototype._getByIndex = function(index) {
	if (!this.array[index]) {
		this.array[index] = new PathPoint();
	}
	return this.array[index];
}

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
}

export { PathPointList };