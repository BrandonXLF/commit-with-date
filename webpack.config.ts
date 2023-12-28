import CopyPlugin from 'copy-webpack-plugin';
import type { Configuration } from 'webpack';

export default [
    {
        target: 'node',
        entry: {
            extension: './src/extension.ts',
        },
        output: {
            libraryTarget: 'commonjs2',
        },
        externals: {
            vscode: 'commonjs vscode',
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader',
                },
            ],
        },
        resolve: {
            extensions: ['.ts'],
        },
    },
    {
        target: 'web',
        entry: {
            webview: './src/webview/index.ts',
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader',
                },
            ],
        },
        resolve: {
            extensions: ['.ts'],
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    {
                        from: 'src/webview/index.css',
                        to: 'webview.css',
                    },
                ],
            }),
        ],
    },
] as Configuration[];
