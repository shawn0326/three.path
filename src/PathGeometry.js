/**
 * THREE.PathGeometry 
 */

THREE.PathGeometry = function() {
    THREE.BufferGeometry.call( this );

    this.maxVertex = 3000;

    this._resizeAttributes();

    this.drawRange.start = 0;
    this.drawRange.count = 0;
}

THREE.PathGeometry.prototype = Object.assign( Object.create( THREE.BufferGeometry.prototype ), {

    constructor: THREE.PathGeometry,

    update: function(points, options) {
        var pointsLength = points.length;

        if(pointsLength < 2) {
            this.drawRange.count = 0;
            return;
        }

        if(this._needLargerBufferSize(points.length)) {
            this.maxVertex *= 2;
            this._resizeAttributes();
        }

        // update attributes
        options = options || {};
        var count = this._updateAttributes(points, options);

        this.drawRange.count = count;
    },

    updateUVScroll(offsetX, offsetY) {
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

    _needLargerBufferSize: function(len) {
        return len * 2 > this.maxVertex;
    },

    _resizeAttributes: function() {
        this.removeAttribute( 'position' );
        this.removeAttribute( 'normal' );
        this.removeAttribute( 'uv' );

        this.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( this.maxVertex * 3 ), 3 ).setDynamic( true ) );
        this.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( this.maxVertex * 3 ), 3 ).setDynamic( true ) );
        this.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( this.maxVertex * 2 ), 2 ).setDynamic( true ) );
    },

    _updateAttributes: function(points, options) {
        var positionAttribute = this.getAttribute( 'position' );
        var normalAttribute = this.getAttribute( 'normal' );
        var uvAttribute = this.getAttribute( 'uv' );

        var width = options.width || 0.1;
        var uvOffset = options.uvOffset || 0;
        var cornerRadius = options.cornerRadius || 0;
        var cornerSplit = options.cornerSplit || 20;

        var count = 0;

        // modify data
        var position = [];
        var normal = [];
        var uv = [];

        var right = new THREE.Vector3();
        var left = new THREE.Vector3();
        function addVertices(point, dir, up, halfWidth, uvDist) {
            right.crossVectors( dir, up ).setLength(halfWidth);
            left.copy( right ).multiplyScalar( -1 ).setLength(halfWidth);

            // TODO calculate up dir

            right.add(point);
            left.add(point);

            position.push(
                left.x, left.y, left.z,
                right.x, right.y, right.z
            );

            normal.push(
                up.x, up.y, up.z,
                up.x, up.y, up.z
            );

            uv.push(
                0, uvDist,
                1, uvDist
            );

            count += 2;
        }

        function addHardCorner(lastPoint, currentPoint, nextPoint) {
            var lastDir = right.subVectors(currentPoint, lastPoint);
            var nextDir = left.subVectors(nextPoint, currentPoint);

            distance += lastDir.length();

            lastDir.normalize();
            nextDir.normalize();

            dir.addVectors( lastDir, nextDir );

            var _cos = lastDir.dot(nextDir);
            _width = _width / Math.sqrt( (1 + _cos) / 2 );

            // if(_width > width * 1.414213562373) {
            //     var cornerOffset = (_width - width * 1.414213562373) / 2;
            //     corner.copy(lastDir).multiplyScalar( -1 ).add( nextDir ).normalize().multiplyScalar( cornerOffset );
            //     corner.add(points[i]);
            //     point = corner;
            // }

            addVertices(currentPoint, dir, up, _width / 2, distance / width - uvOffset);
        }

        var dir = new THREE.Vector3();
        var up = new THREE.Vector3(0, 1, 0);
        var corner = new THREE.Vector3();
        var theLastPoint;
        var distance = 0;
        for(var i = 0, l = points.length; i < l; i++) {

            var _width = width;
            var point = points[i];

            // calculate dir
            if(i == 0) {
                dir.subVectors( points[i + 1], points[i] );

                addVertices(point, dir, up, _width / 2, distance / width - uvOffset);

                theLastPoint = points[i];
            } else if(i == l - 1) {
                dir.subVectors( points[i], theLastPoint );

                distance += dir.length();

                addVertices(point, dir, up, _width / 2, distance / width - uvOffset);

                theLastPoint = points[i];
            } else {

                if(cornerRadius > 0) {
                    var lastPoint = theLastPoint;
                    var currentPoint = points[i];
                    var nextPoint = points[i + 1];

                    var lastDir = right.subVectors(currentPoint, lastPoint);
                    var nextDir = left.subVectors(nextPoint, currentPoint);

                    lastDir.normalize();
                    nextDir.normalize();

                    var startPoint = currentPoint.clone().sub(lastDir.multiplyScalar(cornerRadius));
                    var controlPoint = currentPoint.clone();
                    var endPoint = currentPoint.clone().add(nextDir.multiplyScalar(cornerRadius));

                    var curve3 = new THREE.QuadraticBezierCurve3(startPoint, controlPoint, endPoint);
                    var samplerPoints = curve3.getPoints(cornerSplit);

                    addHardCorner(lastPoint, startPoint, samplerPoints[1]);

                    for(var f = 1; f < cornerSplit; f += 1) {
                        addHardCorner(samplerPoints[f - 1], samplerPoints[f], samplerPoints[f + 1]);
                    }

                    addHardCorner(samplerPoints[cornerSplit - 1], endPoint, nextPoint);

                    theLastPoint = endPoint;

                } else {
                    addHardCorner(theLastPoint, points[i], points[i + 1]);

                    theLastPoint = points[i];
                }
                
            }

        }

        // add start
        var sharp = new THREE.Vector3();
        function addStart(point, dir, up, halfWidth, uvDist) {
            right.crossVectors( dir, up ).setLength(halfWidth * 2);
            left.copy( right ).multiplyScalar( -1 ).setLength(halfWidth * 2);
            sharp.copy(dir).setLength(halfWidth * 3);

            // TODO calculate up dir

            right.add(point);
            left.add(point);
            sharp.add(point);

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
                -0.5, uvDist,
                1.5, uvDist,
                0.5, uvDist + (halfWidth * 3 / (halfWidth * 2) ),
            );

            count += 3;
        }
        addStart(theLastPoint, dir, up, width / 2, distance / width - uvOffset);

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