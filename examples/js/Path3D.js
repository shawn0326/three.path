/**
 * Path3D
 * helper class for path drawing
 */
const Path3D = function() {
	this._drawing = false;
	this._includeDrawingPoint = false;

	this._points = [];

	this._lastPoint = new THREE.Vector3();
	this._lastFixedPoint = new THREE.Vector3();

	this.fixRadius = 0.5;
	this.height = 0.1;

	this._cornerRadius = 0.2;
	this._cornerSplit = 10;

	this._pathPointList = new THREE.PathPointList();

	this._dirty = true;

	this.up = new THREE.Vector3(0, 1, 0); // force up
};

Object.defineProperty(Path3D.prototype, 'cornerRadius', {

	set: function(value) {
		this._cornerRadius = value;
		this._dirty = true;
	},

	get: function() {
		return this._cornerRadius;
	}

});

Object.defineProperty(Path3D.prototype, 'cornerSplit', {

	set: function(value) {
		this._cornerSplit = value;
		this._dirty = true;
	},

	get: function() {
		return this._cornerSplit;
	}

});

Path3D.prototype.getPoints = function() {
	if (this._includeDrawingPoint) {
		this._points.pop();
		this._includeDrawingPoint = false;
	}

	if (this._drawing && this._points.length > 0) {
		const fixedPoint = this._getLastFixedPoint();

		if (fixedPoint) {
			this._points.push(fixedPoint);
			this._includeDrawingPoint = true;
		}
	}

	return this._points;
};

Path3D.prototype.getPathPointList = function() {
	if (this._drawing || this._dirty) {
		this._pathPointList.set(this.getPoints(), this._cornerRadius, this._cornerSplit, this.up);
		this._dirty = false;
	}

	return this._pathPointList;
};

Path3D.prototype.update = function(point) {
	this._lastPoint.copy(point);
	this._lastPoint.y += this.height;
};

Path3D.prototype.confirm = function() {
	this._drawing = true;

	const fixedPoint = this._getLastFixedPoint();

	if (fixedPoint) {
		if (this._includeDrawingPoint) {
			this._points.pop();
			this._includeDrawingPoint = false;
		}

		this._points.push(fixedPoint.clone());
	}

	this._dirty = true;
};

Path3D.prototype.start = function() {
	this._drawing = true;

	this._dirty = true;
};

Path3D.prototype.stop = function() {
	this._drawing = false;

	this._dirty = true;
};

Path3D.prototype.clear = function() {
	this._drawing = false;
	this._includeDrawingPoint = false;

	this._points = [];

	this._dirty = true;
};

const measureVec3 = new THREE.Vector3();
function measureVec3Length(v1, v2) {
	return measureVec3.copy(v2).sub(v1).length();
}
const lastDir = new THREE.Vector3();
const nextDir = new THREE.Vector3();

// 返回实际绘制点，如果鼠标在不合法的绘制范围内，则返回一个null
Path3D.prototype._getLastFixedPoint = function() {
	this._lastFixedPoint.copy(this._lastPoint);

	if (this._points.length > 0) {
		const lastConfirmedPoint = this._includeDrawingPoint ? this._points[this._points.length - 2] : this._points[this._points.length - 1];

		// fix radius
		if (measureVec3Length(lastConfirmedPoint, this._lastFixedPoint) < this.fixRadius) {
			measureVec3.normalize().multiplyScalar(this.fixRadius);
			this._lastFixedPoint.copy(lastConfirmedPoint).add(measureVec3);
		}

		const hasCorner = this._includeDrawingPoint ? (this._points.length > 2) : (this._points.length > 1);
		if (hasCorner) {
			const lastConfirmedPoint2 = this._includeDrawingPoint ? this._points[this._points.length - 3] : this._points[this._points.length - 2];

			lastDir.subVectors(lastConfirmedPoint, lastConfirmedPoint2);
			nextDir.subVectors(this._lastFixedPoint, lastConfirmedPoint);

			lastDir.normalize();
			nextDir.normalize();

			const _cos = lastDir.multiplyScalar(-1).dot(nextDir);
			if (_cos > 0.99) { // 角度非常小的极限情况，将导致贝塞尔bug
				return null;
			}
		}
	}

	return this._lastFixedPoint;
};

