'use strict'
const path = require('path')
const defaultSettings = require('./src/settings.js')

function resolve(dir) {
  return path.join(__dirname, dir)
}

const name = defaultSettings.title || '数字孪生系统'
const port = process.env.port || process.env.npm_config_port || 9527

module.exports = {
  publicPath: '/',
  outputDir: 'dist',
  assetsDir: 'static',
  lintOnSave: process.env.NODE_ENV === 'development',
  productionSourceMap: false,  // 关闭source map减小体积

  devServer: {
    port: port,
    open: true,
    overlay: {
      warnings: false,
      errors: true
    },
    before: require('./mock/mock-server.js')
  },

  configureWebpack: {
    name: name,
    resolve: {
      alias: {
        '@': resolve('src')
      }
    },
    // 优化模块解析
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Three.js 单独打包
          three: {
            name: 'chunk-three',
            test: /[\\/]node_modules[\\/]three[\\/]/,
            priority: 30,
            chunks: 'initial'
          },
          // ElementUI 单独打包
          elementUI: {
            name: 'chunk-elementUI',
            test: /[\\/]node_modules[\\/]_?element-ui(.*)/,
            priority: 20
          },
          // 其他公共库
          libs: {
            name: 'chunk-libs',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'initial'
          }
        }
      }
    }
  },

  chainWebpack(config) {
    // 设置预加载
    config.plugin('preload').tap(() => [
      {
        rel: 'preload',
        fileBlacklist: [/\.map$/, /hot-update\.js$/, /runtime\..*\.js$/],
        include: 'initial'
      }
    ])

    // 关闭预取
    config.plugins.delete('prefetch')

    // SVG处理
    config.module
      .rule('svg')
      .exclude.add(resolve('src/icons'))
      .end()
    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(resolve('src/icons'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]'
      })
      .end()

    // 生产环境优化
    config.when(process.env.NODE_ENV !== 'development',
      config => {
        // 内联runtime
        config
          .plugin('ScriptExtHtmlWebpackPlugin')
          .after('html')
          .use('script-ext-html-webpack-plugin', [{
            inline: /runtime\..*\.js$/
          }])
          .end()

        // Gzip压缩
        config.plugin('compression')
          .use('compression-webpack-plugin', [{
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 8192,
            minRatio: 0.8
          }])
          .end()

        // 代码分割优化
        config.optimization.splitChunks({
          chunks: 'all',
          minSize: 20000,
          maxSize: 250000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          automaticNameDelimiter: '~',
          cacheGroups: {
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true
            }
          }
        })

        // 运行时优化
        config.optimization.runtimeChunk('single')
      }
    )

    // 图片优化
    config.module
      .rule('images')
      .test(/\.(gif|png|jpe?g|svg)$/i)
      .use('image-webpack-loader')
      .loader('image-webpack-loader')
      .options({
        mozjpeg: { progressive: true, quality: 65 },
        optipng: { enabled: false },
        pngquant: { quality: [0.65, 0.8], speed: 4 },
        gifsicle: { interlaced: false },
        webp: { quality: 75 }
      })
      .end()

    // DRACO和KTX2支持
    config.module
      .rule('draco')
      .test(/\.drc$/)
      .use('raw-loader')
      .loader('raw-loader')
      .end()

    config.module
      .rule('ktx2')
      .test(/\.ktx2$/)
      .use('ktx2-loader')
      .loader('ktx2-loader')
      .end()
  }
}