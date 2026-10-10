import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    { ignores: ['dist/**', 'switch/romfs/**'] },
    js.configs.recommended,
    tseslint.configs.recommended,
    {
        rules: {
            'curly': ['error', 'all'],
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'IfStatement > .alternate',
                    message: 'No else / else if. Use a guard clause, a lookup table or a switch.',
                },
            ],
            'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-empty-function': 'error',
            'no-var': 'error',
            'quotes': ['error', 'single', { avoidEscape: true }],
            'semi': ['error', 'never'],
        },
    },
    {
        // The Switch has no DOM. Check for `document` in that build.
        files: ['src/js/**/*.ts'],
        ignores: ['src/js/main.ts', 'src/js/platform/**', 'src/js/render/Surface.ts'],
        rules: {
            'no-restricted-globals': [
                'error',
                {
                    name: 'document',
                    message: 'No document here. Offscreen canvases come from createSurface().',
                },
            ],
        },
    },
)
