import {PathPoint} from './PathPoint.js';

/**
 * PathGeometry 
 * need drawtype THREE.TriangleStripDrawMode
 */
var PathGeometry = function(maxVertex) {
    THREE.BufferGeometry.call( this );

    maxVertex = maxVertex || 3000;

    this.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( maxVertex * 3 ), 3 ).setDynamic( true ) );
    this.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( maxVertex * 3 ), 3 ).setDynamic( true ) );
    this.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( maxVertex * 2 ), 2 ).setDynamic( true ) );

    this.drawRange.start = 0;
    this.drawRange.count = 0;
}

PathGeometry.prototype = Object.assign( Object.create( THREE.BufferGeometry.prototype ), {

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

    /**
     * update uv
     * @param {number} offsetX uv offset x
     * @param {number} offsetY uv offset y
     */
    updateUVScroll: function(offsetX, offsetY) {
        if(this.drawRange.count > 0) {
            var uvAttribute = this.getAttribute( 'uv' );
            for(var i = 0, l = uvAttribute.array.length; i < l; i += 2) {
                uvAttribute.array[i + 0] += offsetX;
                uvAttribute.array[i + 1] += offsetY;
            }
            uvAttribute.updateRange.count = this.drawRange.count * 2;
            uvAttribute.needsUpdate = true;
        }
    },

    _resizeAttribute: function(name, attribute, len) {
        while(attribute.array.length < len) {
            var oldLength = attribute.array.length;
            attribute = attribute.clone();
            attribute.setArray(new Float32Array( oldLength * 2 ));
            this.addAttribute(name, attribute);
        }
    },

    _updateAttributes: function(pathPointList, options) {
        var width = options.width || 0.1;
        var uvOffset = options.uvOffset || 0;
        var uvRatio = options.uvRatio || 1;
        var progress = options.progress !== undefined ? options.progress : 1;
        var arrow = options.arrow !== undefined ? options.arrow : true;

        var count = 0;

        // modify data
        var position = [];
        var normal = [];
        var uv = [];

        var right = new THREE.Vector3();
        var left = new THREE.Vector3();
        function addVertices(pathPoint, halfWidth, uvDist) {
            var dir = pathPoint.dir;
            var up = pathPoint.up;
            var _right = pathPoint.right;

            right.copy(_right).multiplyScalar(halfWidth * pathPoint.widthScale);
            left.copy(_right).multiplyScalar(-halfWidth * pathPoint.widthScale);

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

            count += 2;
        }

        var sharp = new THREE.Vector3();
        function addStart(pathPoint, halfWidth, uvDist) {
            var dir = pathPoint.dir;
            var up = pathPoint.up;
            var _right = pathPoint.right;

            right.copy(_right).multiplyScalar(halfWidth * 2);
            left.copy(_right).multiplyScalar(-halfWidth * 2);
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
                uvDist, -0.5,
                uvDist, 1.5,
                uvDist + (halfWidth * 3 / (halfWidth * 2) / uvRatio ), 0.5 
            );

            count += 3;
        }

        // build path geometry
        var totalDistance = pathPointList.distance();

        if(totalDistance == 0) {
            return 0;
        }
        
        var progressDistance = progress * totalDistance;
        var lastPoint;

        if(progressDistance > 0) {
            for(var i = 0; i < pathPointList.count; i++) {
                var pathPoint = pathPointList.array[i];

                if(pathPoint.dist > progressDistance) {
                    var prevPoint =  pathPointList.array[i - 1];
                    lastPoint = new PathPoint();

                    // linear lerp for progress
                    var alpha = (progressDistance - prevPoint.dist) / (pathPoint.dist - prevPoint.dist);
                    lastPoint.lerpPathPoints(prevPoint, pathPoint, alpha);

                    addVertices(lastPoint, width / 2, lastPoint.dist / width / uvRatio - uvOffset);
                    break;
                } else {
                    addVertices(pathPoint, width / 2, pathPoint.dist / width / uvRatio - uvOffset);
                }
                
            }
        } else {
            lastPoint = pathPointList.array[0];
        }

        // build arrow geometry
        if(arrow) {
            lastPoint = lastPoint || pathPointList.array[pathPointList.count - 1];
            addStart(lastPoint, width / 2, lastPoint.dist / width / uvRatio - uvOffset);
        }

        var positionAttribute = this.getAttribute( 'position' );
        var normalAttribute = this.getAttribute( 'normal' );
        var uvAttribute = this.getAttribute( 'uv' );

        this._resizeAttribute('position', positionAttribute, position.length);
        this._resizeAttribute('normal', normalAttribute, normal.length);
        this._resizeAttribute('uv', uvAttribute, uv.length);

        positionAttribute = this.getAttribute( 'position' );
        normalAttribute = this.getAttribute( 'normal' );
        uvAttribute = this.getAttribute( 'uv' );

        positionAttribute.array.set(position, 0);
        normalAttribute.array.set(normal, 0);
        uvAttribute.array.set(uv, 0);

        positionAttribute.updateRange.count = position.length;
        normalAttribute.updateRange.count = normal.length;
        uvAttribute.updateRange.count = uv.length;

        positionAttribute.needsUpdate = true;
        normalAttribute.needsUpdate = true;
        uvAttribute.needsUpdate = true;

        return count;
    }

});

export {PathGeometry};
