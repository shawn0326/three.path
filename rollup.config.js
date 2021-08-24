import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';

const babelrc = {
	presets: [
		[
			'@babel/preset-env',
			{
				modules: false,
				targets: '>0.3%, not dead',
				loose: true,
				bugfixes: true,
			},
		],
	]
};

function babelCleanup() {
	const doubleSpaces = / {2}/g;
	return {
		transform(code) {
			code = code.replace(doubleSpaces, '\t');
			return {
				code: code,
				map: null
			};
		}
	};
}

function header() {
	return {
		renderChunk(code) {
			return '// github.com/shawn0326/three.path\n' + code;
		}
	};
}

export default [
	{
		input: 'src/main.js',
		plugins: [
			babel({
				babelHelpers: 'bundled',
				compact: false,
				babelrc: false,
				...babelrc
			}),
			babelCleanup(),
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
			babel({
				babelHelpers: 'bundled',
				babelrc: false,
				...babelrc
			}),
			babelCleanup(),
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