/**
 * PathPoint
 */
var PathPoint = function() {
	this.pos = new THREE.Vector3();

	this.dir = new THREE.Vector3();

	this.right = new THREE.Vector3();

	this.up = new THREE.Vector3(); // normal

	this.dist = 0; // distance from start

	this.widthScale = 1;
}

PathPoint.prototype.lerpPathPoints = function(p1, p2, alpha) {
	this.pos.lerpVectors(p1.pos, p2.pos, alpha);
	this.dir.lerpVectors(p1.dir, p2.dir, alpha);
	this.up.lerpVectors(p1.up, p2.up, alpha);
	this.right.lerpVectors(p1.right, p2.right, alpha);
	this.dist = (p2.dist - p1.dist) * alpha + p1.dist;
	this.widthScale = (p2.widthScale - p1.widthScale) * alpha + p1.widthScale;
}

PathPoint.prototype.copy = function(source) {
	this.pos.copy(source.pos);
	this.dir.copy(source.dir);
	this.up.copy(source.up);
	this.right.copy(source.right);
	this.dist = source.dist;
	this.widthScale = source.widthScale;
}

export { PathPoint };