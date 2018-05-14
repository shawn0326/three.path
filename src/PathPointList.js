(function() {
    var up1 = new THREE.Vector3(1, 0, 0);
    var up2 = new THREE.Vector3(0, 1, 0);
    var up3 = new THREE.Vector3(0, 0, 1);

    var PathPoint = function() {

        this.pos = new THREE.Vector3();

        this.dir = new THREE.Vector3();

        this.right = new THREE.Vector3();

        this.up = new THREE.Vector3(); // normal

        this.dist = 0; // distance from start

        this.widthScale = 1;

    }

    // TODO
    PathPoint.prototype.updateUpAndRight = function(staticUp) {
        var up;
        if(staticUp) {
            up = up2;
            if(this.dir.x === this.dir.z && this.dir.x === 0) {
                up = up3;
            }
            this.right.crossVectors( this.dir, up ).normalize();
            this.up.crossVectors( this.right, this.dir ).normalize();
        } else {
            var min = Number.MAX_VALUE;
            var tx = Math.abs( this.dir.x );
            var ty = Math.abs( this.dir.y );
            var tz = Math.abs( this.dir.z );
            var nagative;
            // error
            if(tx < min) {
                min = tx;
                up = up1;
                nagative = this.dir.x < 0;
            }
            if(ty < min) {
                min = ty;
                up = up2;
                nagative = this.dir.y < 0;
            }
            if(tz < min) {
                up = up3;
                nagative = this.dir.z < 0;
            }
            this.up.copy(up)//.multiplyScalar(nagative ? -1 : 1);
            // up = up2;
            // if(this.dir.x > this.dir.z && this.dir.x > this.dir.y) {
            //     up = up3;
            // }
            this.right.crossVectors( this.dir, this.up ).normalize();
            this.up.crossVectors( this.right, this.dir ).normalize();
        }
    }

    PathPoint.prototype.lerpPathPoints = function(p1, p2, alpha) {
        this.pos.lerpVectors(p1.pos, p2.pos, alpha);
        this.dir.lerpVectors(p1.dir, p2.dir, alpha);
        this.up.lerpVectors(p1.up, p2.up, alpha);
        this.right.lerpVectors(p1.right, p2.right, alpha);
        this.dist = (p2.dist - p1.dist) * alpha + p1.dist;
        this.widthScale = (p2.widthScale - p1.widthScale) * alpha + p1.widthScale;
    }

    THREE.PathPoint = PathPoint;

    var PathPointList = function() {
        this.array = []; // path point array
        this.count = 0;
    }

    PathPointList.prototype.set = function(points, cornerRadius, cornerSplit, staticUp) {
        if(points.length < 2) {
            this.count = 0;
            return;
        }

        cornerRadius = cornerRadius !== undefined ? cornerRadius : 0;
        cornerSplit = cornerSplit !== undefined ? cornerSplit : 20;
        staticUp = staticUp !== undefined ? staticUp : true;

        for(var i = 0, l = points.length; i < l; i++) {
            if(i === 0) {
                this._start(points[i], points[i + 1]);
            } else if(i === l - 1) {
                this._end(points[i], staticUp);
            } else {
                this._corner(points[i], points[i + 1], cornerRadius, cornerSplit, staticUp);
            }
        }
    }

    PathPointList.prototype.distance = function() {
        if(this.count == 0) {
            return 0;
        } else {
            return this.array[this.count - 1].dist;
        }
    }

    PathPointList.prototype._start = function(current, next) {

        this.count = 0;

        var point = this._getByIndex( this.count );

        point.pos.copy(current);
        point.dir.subVectors( next, current );
        point.updateUpAndRight(true);
        point.dist = 0;
        point.widthScale = 1;

        point.dir.normalize();

        this.count++;
        
    }

    var helpVec3_1 = new THREE.Vector3();
    var helpVec3_2 = new THREE.Vector3();
    var helpVec3_3 = new THREE.Vector3();
    var helpCurve = new THREE.QuadraticBezierCurve3();

    PathPointList.prototype._corner = function(current, next, cornerRadius, cornerSplit, staticUp) {

        if(cornerRadius > 0 && cornerSplit > 0) {
            var lastPoint = this.array[this.count - 1];
            var curve = this._getCornerBezierCurve(lastPoint.pos, current, next, cornerRadius, helpCurve);
            var samplerPoints = curve.getPoints(cornerSplit); // TODO optimize

            for(var f = 0; f < cornerSplit; f += 1) {
                this._hardCorner(samplerPoints[f], samplerPoints[f + 1], staticUp);
            }

            this._hardCorner(samplerPoints[cornerSplit], next, staticUp);
        } else {
            this._hardCorner(current, next, staticUp);
        }

    }

    PathPointList.prototype._hardCorner = function(current, next, staticUp) {
        var lastPoint = this.array[this.count - 1];
        var point = this._getByIndex(this.count);

        var lastDir = helpVec3_1.subVectors(current, lastPoint.pos);
        var nextDir = helpVec3_2.subVectors(next, current);

        point.pos.copy(current);
        point.dir.addVectors( lastDir, nextDir );
        point.updateUpAndRight(staticUp);
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

    PathPointList.prototype._end = function(current, staticUp) {
        var lastPoint = this.array[this.count - 1];
        var point = this._getByIndex(this.count);

        point.pos.copy(current);
        point.dir.subVectors( current, lastPoint.pos );
        point.updateUpAndRight(staticUp);
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

    THREE.PathPointList = PathPointList;
})();