import globals from "globals";
import tseslint from "typescript-eslint";

export default [
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: "module",
				project: ["./tsconfig.json", "./tsconfig.test.json"],
			},
			globals: globals.node,
		},
		plugins: {
			"@typescript-eslint": tseslint.plugin,
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-unused-expressions": [
				"error",
				{ allowShortCircuit: true },
			],
		},
	},
];
