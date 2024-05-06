import { Vector3, Matrix4, QuadraticBezierCurve3 } from 'three';
import { PathPoint } from './PathPoint.js';

/**
 * PathPointList
 * input points to generate a PathPoint list
 */
class PathPointList {

	constructor() {
		this.array = []; // path point array
		this.count = 0;
	}

	/**
	 * Set points
	 * @param {Vector3[]} points key points array
	 * @param {number} cornerRadius? the corner radius. set 0 to disable round corner. default is 0.1
	 * @param {number} cornerSplit? the corner split. default is 10.
	 * @param {number} up? force up. default is auto up (calculate by tangent).
	 * @param {boolean} close? close path. default is false.
	 */
	set(points, cornerRadius = 0.1, cornerSplit = 10, up = null, close = false) {
		points = points.slice(0);

		if (points.length < 2) {
			console.warn('PathPointList: points length less than 2.');
			this.count = 0;
			return;
		}

		// Auto close
		if (close && !points[0].equals(points[points.length - 1])) {
			points.push(new Vector3().copy(points[0]));
		}

		// Generate path point list
		for (let i = 0, l = points.length; i < l; i++) {
			if (i === 0) {
				this._start(points[i], points[i + 1], up);
			} else if (i === l - 1) {
				if (close) {
					// Connect end point and start point
					this._corner(points[i], points[1], cornerRadius, cornerSplit, up);

					// Fix start point
					const dist = this.array[0].dist; // should not copy dist
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
	distance() {
		if (this.count > 0) {
			return this.array[this.count - 1].dist;
		}
		return 0;
	}

	_getByIndex(index) {
		if (!this.array[index]) {
			this.array[index] = new PathPoint();
		}
		return this.array[index];
	}

	_start(current, next, up) {
		this.count = 0;

		const point = this._getByIndex(this.count);

		point.pos.copy(current);
		point.dir.subVectors(next, current);

		// init start up dir
		if (up) {
			point.up.copy(up);
		} else {
			// select an initial normal vector perpendicular to the first tangent vector
			let min = Number.MAX_VALUE;
			const tx = Math.abs(point.dir.x);
			const ty = Math.abs(point.dir.y);
			const tz = Math.abs(point.dir.z);
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

	_end(current) {
		const lastPoint = this.array[this.count - 1];
		const point = this._getByIndex(this.count);

		point.pos.copy(current);
		point.dir.subVectors(current, lastPoint.pos);
		const dist = point.dir.length();
		point.dir.normalize();

		point.up.copy(lastPoint.up); // copy last up

		const vec = helpVec3_1.crossVectors(lastPoint.dir, point.dir);
		if (vec.length() > Number.EPSILON) {
			vec.normalize();
			const theta = Math.acos(Math.min(Math.max(lastPoint.dir.dot(point.dir), -1), 1)); // clamp for floating pt errors
			point.up.applyMatrix4(helpMat4.makeRotationAxis(vec, theta));
		}

		point.right.crossVectors(point.dir, point.up).normalize();

		point.dist = lastPoint.dist + dist;
		point.widthScale = 1;
		point.sharp = false;

		this.count++;
	}

	_corner(current, next, cornerRadius, cornerSplit, up) {
		if (cornerRadius > 0 && cornerSplit > 0) {
			const lastPoint = this.array[this.count - 1];
			const curve = _getCornerBezierCurve(lastPoint.pos, current, next, cornerRadius, (this.count - 1) === 0, helpCurve);
			const samplerPoints = curve.getPoints(cornerSplit); // TODO optimize

			for (let f = 0; f < cornerSplit; f++) {
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
	_sharpCorner(current, next, up, dirType = 0, sharp = false) {
		const lastPoint = this.array[this.count - 1];
		const point = this._getByIndex(this.count);

		const lastDir = helpVec3_1.subVectors(current, lastPoint.pos);
		const nextDir = helpVec3_2.subVectors(next, current);

		const lastDirLength = lastDir.length();

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

			const vec = helpVec3_3.crossVectors(lastPoint.dir, point.dir);
			if (vec.length() > Number.EPSILON) {
				vec.normalize();
				const theta = Math.acos(Math.min(Math.max(lastPoint.dir.dot(point.dir), -1), 1)); // clamp for floating pt errors
				point.up.applyMatrix4(helpMat4.makeRotationAxis(vec, theta));
			}

			point.right.crossVectors(point.dir, point.up).normalize();
		}

		point.dist = lastPoint.dist + lastDirLength;

		const _cos = lastDir.dot(nextDir);
		point.widthScale = Math.min(1 / Math.sqrt((1 + _cos) / 2), 1.415) || 1;
		point.sharp = (Math.abs(_cos - 1) > 0.05) && sharp;

		this.count++;
	}

}

const helpVec3_1 = new Vector3();
const helpVec3_2 = new Vector3();
const helpVec3_3 = new Vector3();
const helpMat4 = new Matrix4();
const helpCurve = new QuadraticBezierCurve3();

function _getCornerBezierCurve(last, current, next, cornerRadius, firstCorner, out) {
	const lastDir = helpVec3_1.subVectors(current, last);
	const nextDir = helpVec3_2.subVectors(next, current);

	const lastDirLength = lastDir.length();
	const nextDirLength = nextDir.length();

	lastDir.normalize();
	nextDir.normalize();

	// cornerRadius can not bigger then lineDistance / 2, auto fix this
	const v0Dist = Math.min((firstCorner ? lastDirLength / 2 : lastDirLength) * 0.999999, cornerRadius);
	out.v0.copy(current).sub(lastDir.multiplyScalar(v0Dist));

	out.v1.copy(current);

	const v2Dist = Math.min(nextDirLength / 2 * 0.999999, cornerRadius);
	out.v2.copy(current).add(nextDir.multiplyScalar(v2Dist));

	return out;
}

export { PathPointList };