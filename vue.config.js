const path = require('path')
const resolve = (dir) => path.join(__dirname, dir)

module.exports = {
  // lintOnSave: false,
  chainWebpack: (config) => {
    // 别名 alias
    config.resolve.alias
      .set('@', resolve('src'))
      .set('utils', resolve('src/utils'))
      .set('common', resolve('src/common'))
      .set('assets', resolve('src/assets'))
      .set('components', resolve('src/components'))
  },
}
