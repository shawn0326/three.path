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
    }

    THREE.PathGeometry.prototype = Object.assign( Object.create( THREE.BufferGeometry.prototype ), {

        constructor: THREE.PathGeometry,

        /**
         * update uv
         * @param {THREE.PathPointList} pathPointList
         * @param {Object} options
         */
        update: function(pathPointList, options) {
            if(this._needLargerBufferSize(pathPointList.count)) {
                this._maxVertex *= 2;
                this._resizeAttributes();
            }

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

        _updateAttributes: function(pathPointList, options) {
            var positionAttribute = this.getAttribute( 'position' );
            var normalAttribute = this.getAttribute( 'normal' );
            var uvAttribute = this.getAttribute( 'uv' );

            var width = options.width || 0.1;
            var uvOffset = options.uvOffset || 0;
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
                        lastPoint = new THREE.PathPoint();
    
                        // linear lerp for progress
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
                lastPoint = pathPointList.array[0];
            }

            // build arrow geometry
            lastPoint = lastPoint || pathPointList.array[pathPointList.count - 1];
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
    
})();
