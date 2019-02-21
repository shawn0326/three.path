const INDENT = '\t';
const BANNER = '/* https://github.com/shawn0326/three.path */';

export default {
	input: 'src/main.js',
	plugins: [
	],
	// sourceMap: true,
	output: [
		{
			format: 'umd',
			file: 'build/three.path.js',
			indent: INDENT,
			banner: BANNER,
			name: 'THREE',
			extend: true
		},
		{
			format: 'es',
			file: 'build/three.path.module.js',
			indent: INDENT,
			banner: BANNER
		}
	]
};