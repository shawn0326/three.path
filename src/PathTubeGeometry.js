import {PathPoint} from './PathPoint.js';
import {PathGeometry} from './PathGeometry.js';

/**
 * PathTubeGeometry 
 */
var PathTubeGeometry = function(maxVertex) {
    PathGeometry.call( this, maxVertex || 1000 );

    this.setIndex( new Array((maxVertex || 1000) * 2) );

}

PathTubeGeometry.prototype = Object.assign( Object.create( PathGeometry.prototype ), {

    constructor: PathTubeGeometry,

    _resizeIndex: function(index, len) {
        while(index.array.length < len) {
            var oldLength = index.array.length;
            var newIndex = new THREE.BufferAttribute(
                oldLength * 2 > 65535 ? new Uint32Array( oldLength * 2 ) : new Uint16Array( oldLength * 2 ),
                1
            );
            newIndex.name = index.name;
            newIndex.usage = index.usage;
            this.setIndex(newIndex);
        }
    },

    _updateAttributes: function(pathPointList, options) {
        var radius = options.radius || 0.1;
        var radialSegments = options.radialSegments || 8;
        radialSegments = Math.max(2, radialSegments);
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

            for(var r = 0; r <= radialSegments; r++) {
                var _r = r;
                if(_r == radialSegments) {
                    _r = 0;
                }
                normalDir.copy(pathPoint.up).applyAxisAngle(pathPoint.dir, startRad + Math.PI * 2 * _r / radialSegments).normalize();

                position.push(pathPoint.pos.x + normalDir.x * radius * pathPoint.widthScale, pathPoint.pos.y + normalDir.y * radius * pathPoint.widthScale, pathPoint.pos.z + normalDir.z * radius * pathPoint.widthScale);
                normal.push(normalDir.x, normalDir.y, normalDir.z);
                uv.push(uvDist, r / radialSegments);

                verticesCount++;
            }

            if(!first) {
                var begin1 = verticesCount - (radialSegments + 1) * 2;
                var begin2 = verticesCount - (radialSegments + 1);

                for(var i = 0; i < radialSegments; i++) {
                    // if(i == radialSegments - 1) {
                    //     indices.push(
                    //         begin1, begin1 + i, begin2 + i,
                    //         begin2, begin1, begin2 + i
                    //     );
                    // } else {
                        indices.push(
                            begin2 + i, begin1 + i, begin1 + i + 1,
						    begin2 + i, begin1 + i + 1, begin2 + i + 1
                        );
                    // }
                    
                    count += 6;
                }
                
            }
            
        }

        // build path geometry
        var totalDistance = pathPointList.distance();
        var progressDistance = progress * totalDistance;

        if(progressDistance == 0) {
            return 0;
        }

        if(progressDistance > 0) {
            for(var i = 0; i < pathPointList.count; i++) {
                var pathPoint = pathPointList.array[i];

                if(pathPoint.dist > progressDistance) {
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

        var positionAttribute = this.getAttribute( 'position' );
        var normalAttribute = this.getAttribute( 'normal' );
        var uvAttribute = this.getAttribute( 'uv' );
        var indexAttribute = this.getIndex();

        this._resizeAttribute('position', positionAttribute, position.length);
        this._resizeAttribute('normal', normalAttribute, normal.length);
        this._resizeAttribute('uv', uvAttribute, uv.length);
        this._resizeIndex(indexAttribute, indices.length);

        positionAttribute = this.getAttribute( 'position' );
        normalAttribute = this.getAttribute( 'normal' );
        uvAttribute = this.getAttribute( 'uv' );
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

export {PathTubeGeometry};