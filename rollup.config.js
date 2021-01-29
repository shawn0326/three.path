import { terser } from 'rollup-plugin-terser';

function header() {
	return {
		renderChunk(code) {
			return '// https://github.com/shawn0326/three.path\n' + code;
		}
	};
}

export default [
	{
		input: 'src/main.js',
		plugins: [
			header()
		],
		output: {
			format: 'umd',
			file: 'build/three.path.js',
			name: 'THREE',
			extend: true
		}
	},
	{
		input: 'src/main.js',
		plugins: [
			terser(),
			header()
		],
		output: {
			format: 'umd',
			file: 'build/three.path.min.js',
			name: 'THREE',
			extend: true
		}
	},
	{
		input: 'src/main.js',
		plugins: [
			header()
		],
		output: {
			format: 'esm',
			file: 'build/three.path.module.js'
		}
	}
];