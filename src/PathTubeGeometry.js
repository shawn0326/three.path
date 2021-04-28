import { PathPoint } from './PathPoint.js';
import { PathGeometry } from './PathGeometry.js';

/**
 * PathTubeGeometry
 */
var PathTubeGeometry = function(maxVertex, generateUv2) {
	PathGeometry.call(this, maxVertex || 1000, generateUv2);
}

PathTubeGeometry.prototype = Object.assign(Object.create(PathGeometry.prototype), {

	constructor: PathTubeGeometry,

	_updateAttributes: function(pathPointList, options) {
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

		var count = 0;

		// modify data
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
					indices.push(
						begin2 + i, begin1 + i, begin1 + i + 1,
						begin2 + i, begin1 + i + 1, begin2 + i + 1
					);

					count += 6;
				}
			}
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

					addVertices(lastPoint, radius, radialSegments);
					break;
				} else {
					addVertices(pathPoint, radius, radialSegments);
				}
			}
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

export { PathTubeGeometry };