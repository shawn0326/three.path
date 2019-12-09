import {PathPoint} from './PathPoint.js';

/**
 * PathGeometry 
 * need drawtype THREE.TriangleStripDrawMode
 */
var PathGeometry = function(maxVertex) {
    THREE.BufferGeometry.call( this );

    maxVertex = maxVertex || 3000;

    if (this.setAttribute) {
        this.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array( maxVertex * 3 ), 3 ).setUsage( THREE.DynamicDrawUsage ) );
        this.setAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( maxVertex * 3 ), 3 ).setUsage( THREE.DynamicDrawUsage ) );
        this.setAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( maxVertex * 2 ), 2 ).setUsage( THREE.DynamicDrawUsage ) );
    } else {
        this.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( maxVertex * 3 ), 3 ).setDynamic( true ) );
        this.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( maxVertex * 3 ), 3 ).setDynamic( true ) );
        this.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( maxVertex * 2 ), 2 ).setDynamic( true ) );
    }

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

    _resizeAttribute: function(name, attribute, len) {
        while(attribute.array.length < len) {
            var oldLength = attribute.array.length;
            var newAttribute = new THREE.BufferAttribute(
                new Float32Array( oldLength * 2 ), 
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

        var right = new THREE.Vector3();
        var left = new THREE.Vector3();
        function addVertices(pathPoint, halfWidth, uvDist) {
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

            count += 2;
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
                uvDist + ( halfWidth * 3 / (side !== "both" ? halfWidth : halfWidth * 2) ), side !== "both" ? 0 : 0.5 
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
        if(arrow) {
            lastPoint = lastPoint || pathPointList.array[pathPointList.count - 1];
            addStart(lastPoint, width / 2, lastPoint.dist / (side !== "both" ? width / 2 : width));
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
