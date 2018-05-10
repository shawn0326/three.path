(function() {

    /**
     * THREE.PathGeometry 
     */

    THREE.PathGeometry = function() {
        THREE.BufferGeometry.call( this );

        this._maxVertex = 3000;

        this._resizeAttributes();

        this.drawRange.start = 0;
        this.drawRange.count = 0;

        this._pathPointList = new PathPointList();
    }

    THREE.PathGeometry.prototype = Object.assign( Object.create( THREE.BufferGeometry.prototype ), {

        constructor: THREE.PathGeometry,

        /**
         * update uv
         * @param {THREE.Vector3[]} points
         * @param {Object} options
         */
        update: function(points, options) {
            var pointsLength = points.length;

            if(pointsLength < 2) {
                this.drawRange.count = 0;
                return;
            }

            if(this._needLargerBufferSize(points.length)) {
                this._maxVertex *= 2;
                this._resizeAttributes();
            }

            // update attributes
            options = options || {};
            var count = this._updateAttributes(points, options);

            this.drawRange.count = count;
        },

        /**
         * update uv
         * @param {number} offsetX uv offset x
         * @param {number} offsetY uv offset y
         */
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
            return len * 2 > this._maxVertex;
        },

        _resizeAttributes: function() {
            this.removeAttribute( 'position' );
            this.removeAttribute( 'normal' );
            this.removeAttribute( 'uv' );

            this.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( this._maxVertex * 3 ), 3 ).setDynamic( true ) );
            this.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( this._maxVertex * 3 ), 3 ).setDynamic( true ) );
            this.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( this._maxVertex * 2 ), 2 ).setDynamic( true ) );
        },

        _updateAttributes: function(points, options) {
            var positionAttribute = this.getAttribute( 'position' );
            var normalAttribute = this.getAttribute( 'normal' );
            var uvAttribute = this.getAttribute( 'uv' );

            var width = options.width || 0.1;
            var uvOffset = options.uvOffset || 0;
            var cornerRadius = options.cornerRadius || 0;
            var cornerSplit = options.cornerSplit || 20;
            var progress = options.progress !== undefined ? options.progress : 1;

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

                // TODO re calculate up dir

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

            // build path point list
            for(var i = 0, l = points.length; i < l; i++) {
                if(i === 0) {
                    this._pathPointList.start(points[i], points[i + 1]);
                } else if(i === l - 1) {
                    this._pathPointList.end(points[i]);
                } else {
                    this._pathPointList.corner(points[i], points[i + 1], cornerRadius, cornerSplit);
                }
            }

            // build path geometry
            var totalDistance = this._pathPointList.array[this._pathPointList.count - 1].dist;
            var progressDistance = progress * totalDistance;
            var lastPoint;

            if(progressDistance > 0) {
                for(var i = 0; i < this._pathPointList.count; i++) {
                    var pathPoint = this._pathPointList.array[i];
    
                    if(pathPoint.dist > progressDistance) {
                        var prevPoint =  this._pathPointList.array[i - 1];
                        lastPoint = new PathPoint();
    
                        // linear lerp
                        var alpha = (progressDistance - prevPoint.dist) / (pathPoint.dist - prevPoint.dist);
                        lastPoint.pos.lerpVectors(prevPoint.pos, pathPoint.pos, alpha);
                        lastPoint.dir.lerpVectors(prevPoint.dir, pathPoint.dir, alpha);
                        lastPoint.up.lerpVectors(prevPoint.up, pathPoint.up, alpha);
                        lastPoint.dist = progressDistance;
                        lastPoint.widthScale = 1;
    
                        addVertices(lastPoint.pos, lastPoint.dir, lastPoint.up, width / 2, lastPoint.dist / width - uvOffset);
                        break;
                    } else {
                        addVertices(pathPoint.pos, pathPoint.dir, pathPoint.up, width / 2, pathPoint.dist / width - uvOffset);
                    }
                    
                }
            } else {
                lastPoint = this._pathPointList.array[0];
            }

            // build arrow geometry
            lastPoint = lastPoint || this._pathPointList.array[this._pathPointList.count - 1];
            addStart(lastPoint.pos, lastPoint.dir, lastPoint.up, width / 2, lastPoint.dist / width - uvOffset);

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

    var PathPoint = function() {

        this.pos = new THREE.Vector3();

        this.dir = new THREE.Vector3();

        this.up = new THREE.Vector3(); // normal

        this.dist = 0; // distance from start

        this.widthScale = 1;

    }

    var PathPointList = function() {
        this.array = []; // path point array
        this.count = 0;

        this.up = new THREE.Vector3(0, 1, 0);
    }

    PathPointList.prototype.start = function(current, next) {

        this.count = 0;

        var point = this._getByIndex( this.count );

        point.pos.copy(current);
        point.dir.subVectors( next, current );
        point.up.copy(this.up);
        point.dist = 0;
        point.widthScale = 1;

        point.dir.normalize();

        this.count++;
        
    }

    var helpVec3_1 = new THREE.Vector3();
    var helpVec3_2 = new THREE.Vector3();
    var helpVec3_3 = new THREE.Vector3();
    var helpCurve = new THREE.QuadraticBezierCurve3();

    PathPointList.prototype.corner = function(current, next, cornerRadius, cornerSplit) {

        if(cornerRadius > 0) {
            var lastPoint = this.array[this.count - 1];
            var curve = this._getCornerBezierCurve(lastPoint.pos, current, next, cornerRadius, helpCurve);
            var samplerPoints = curve.getPoints(cornerSplit);

            for(var f = 0; f < cornerSplit; f += 1) {
                this.hardCorner(samplerPoints[f], samplerPoints[f + 1]);
            }

            this.hardCorner(samplerPoints[cornerSplit], next);
        } else {
            this.hardCorner(current, next);
        }

    }

    PathPointList.prototype.hardCorner = function(current, next) {
        var lastPoint = this.array[this.count - 1];
        var point = this._getByIndex(this.count);

        var lastDir = helpVec3_1.subVectors(current, lastPoint.pos);
        var nextDir = helpVec3_2.subVectors(next, current);

        point.pos.copy(current);
        point.dir.addVectors( lastDir, nextDir );
        point.up.copy(this.up);
        point.dist = lastPoint.dist + lastDir.length();

        var _cos = lastDir.normalize().dot( nextDir.normalize() );
        point.widthScale = 1 / Math.sqrt( (1 + _cos) / 2 );

        // if(point.widthScale > 1.414213562373) {
        //     var offsetDist = (point.widthScale - 1.414213562373) / 2;
        //     var offset = helpVec3_3.copy(lastDir).multiplyScalar( -1 ).add( nextDir ).normalize().multiplyScalar( offsetDist );
        //     point.pos.add(offset);
        // }

        point.dir.normalize();

        this.count++;
    }

    PathPointList.prototype.end = function(current) {
        var lastPoint = this.array[this.count - 1];
        var point = this._getByIndex(this.count);

        point.pos.copy(current);
        point.dir.subVectors( current, lastPoint.pos );
        point.up.copy(this.up);
        point.dist = lastPoint.dist + point.dir.length();
        point.widthScale = 1;

        point.dir.normalize();

        this.count++;
    }

    PathPointList.prototype._getByIndex = function(index) {
        if(!this.array[index]) {
            this.array[index] = new PathPoint();
        }
        return this.array[index];
    }

    PathPointList.prototype._getCornerBezierCurve = function(last, current, next, cornerRadius, out) {

        var lastDir = helpVec3_1.subVectors(current, last);
        var nextDir = helpVec3_2.subVectors(next, current);

        lastDir.normalize();
        nextDir.normalize();

        out.v0.copy(current).sub(lastDir.multiplyScalar(cornerRadius));
        out.v1.copy(current);
        out.v2.copy(current).add(nextDir.multiplyScalar(cornerRadius));

        return out;

    }
})();
