import { BufferAttribute, Uint32BufferAttribute, Uint16BufferAttribute, StaticDrawUsage, Vector3 } from 'three';
import { PathPoint } from './PathPoint.js';
import { PathGeometry } from './PathGeometry.js';

/**
 * PathTubeGeometry
 */
class PathTubeGeometry extends PathGeometry {

	/**
	 * @param {object|number} initData - If initData is number, geometry init by empty data and set it as the max vertex. If initData is Object, it contains pathPointList and options.
	 * @param {boolean} [generateUv2=false]
	 */
	constructor(initData = 1000, generateUv2 = false) {
		super(initData, generateUv2);
	}

	_initByData(pathPointList, options = {}, usage, generateUv2) {
		const vertexData = generateTubeVertexData(pathPointList, options, generateUv2);

		if (vertexData && vertexData.count !== 0) {
			this.setAttribute('position', new BufferAttribute(new Float32Array(vertexData.position), 3).setUsage(usage || StaticDrawUsage));
			this.setAttribute('normal', new BufferAttribute(new Float32Array(vertexData.normal), 3).setUsage(usage || StaticDrawUsage));
			this.setAttribute('uv', new BufferAttribute(new Float32Array(vertexData.uv), 2).setUsage(usage || StaticDrawUsage));
			if (generateUv2) {
				this.setAttribute('uv2', new BufferAttribute(new Float32Array(vertexData.uv2), 2).setUsage(usage || StaticDrawUsage));
			}

			this.setIndex((vertexData.position.length / 3) > 65536 ?
				new Uint32BufferAttribute(vertexData.indices, 1) :
				new Uint16BufferAttribute(vertexData.indices, 1)
			);
		} else {
			this._initByMaxVertex(2, generateUv2);
		}
	}

	/**
	 * Update geometry by PathPointList instance
	 * @param {PathPointList} pathPointList
	 * @param {Object} options
	 * @param {Number} [options.radius=0.1]
	 * @param {Number} [options.progress=1]
	 * @param {Boolean} [options.radialSegments=8]
	 * @param {String} [options.startRad=0]
	 */
	update(pathPointList, options = {}) {
		const generateUv2 = !!this.getAttribute('uv2');

		const vertexData = generateTubeVertexData(pathPointList, options, generateUv2);

		if (vertexData) {
			this._updateAttributes(vertexData.position, vertexData.normal, vertexData.uv, generateUv2 ? vertexData.uv2 : null, vertexData.indices);
			this.drawRange.count = vertexData.count;
		} else {
			this.drawRange.count = 0;
		}
	}

}

// Vertex Data Generate Functions

function generateTubeVertexData(pathPointList, options, generateUv2 = false) {
	const radius = options.radius || 0.1;
	const progress = options.progress !== undefined ? options.progress : 1;
	const radialSegments = Math.max(2, options.radialSegments || 8);
	const startRad = options.startRad || 0;

	const circum = radius * 2 * Math.PI;
	const totalDistance = pathPointList.distance();
	const progressDistance = progress * totalDistance;
	if (progressDistance == 0) {
		return null;
	}

	let count = 0;

	// modify data
	const position = [];
	const normal = [];
	const uv = [];
	const uv2 = [];
	const indices = [];
	let verticesCount = 0;

	const normalDir = new Vector3();
	function addVertices(pathPoint, radius, radialSegments) {
		const first = position.length === 0;
		const uvDist = pathPoint.dist / circum;
		const uvDist2 = pathPoint.dist / totalDistance;

		for (let r = 0; r <= radialSegments; r++) {
			let _r = r;
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
			const begin1 = verticesCount - (radialSegments + 1) * 2;
			const begin2 = verticesCount - (radialSegments + 1);

			for (let i = 0; i < radialSegments; i++) {
				indices.push(
					begin2 + i, begin1 + i, begin1 + i + 1,
					begin2 + i, begin1 + i + 1, begin2 + i + 1
				);

				count += 6;
			}
		}
	}

	if (progressDistance > 0) {
		for (let i = 0; i < pathPointList.count; i++) {
			const pathPoint = pathPointList.array[i];

			if (pathPoint.dist > progressDistance) {
				const prevPoint = pathPointList.array[i - 1];
				const lastPoint = new PathPoint();

				// linear lerp for progress
				const alpha = (progressDistance - prevPoint.dist) / (pathPoint.dist - prevPoint.dist);
				lastPoint.lerpPathPoints(prevPoint, pathPoint, alpha);

				addVertices(lastPoint, radius, radialSegments);
				break;
			} else {
				addVertices(pathPoint, radius, radialSegments);
			}
		}
	}

	return {
		position,
		normal,
		uv,
		uv2,
		indices,
		count
	};
}

export { PathTubeGeometry };