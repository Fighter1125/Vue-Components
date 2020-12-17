<template>
  <div class="selectBar">
    <span class="title">{{ title }}：</span>
    <div class="select-wrap">
      <!-- 一级选项 -->
      <div class="select-1">
        <div
          v-for="(item, idx1) in innerOptions"
          :key="item.label"
          :class="[
            'select-item',
            { active: selected1Index.indexOf(idx1) >= 0 && (item.children ? item.count > 0 : true) },
            { current: currSelector && currSelector.value === item.value },
          ]"
          @click="selectParent(item, idx1)"
        >
          {{ item.label }}
          <span v-if="item.children">
            <span class="badge" v-show="item.count > 0">{{ item.count }}</span>
            <Icon :type="currSelector && currSelector.value == item.value ? 'ios-arrow-up' : 'ios-arrow-down'" />
          </span>
        </div>
        <div class="slot">
          <slot />
        </div>
      </div>
      <!-- 二级选项 -->
      <div class="select-2" v-if="currSelector">
        <span
          v-for="(child, idx2) in currSelector.children"
          :key="child.label"
          :class="['select-item', { active: selected2Index.indexOf(idx2) >= 0 }]"
          @click="selectChild(child, idx2, currSelector)"
        >
          {{ child.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { deepClone } from 'utils'

export default {
  name: 'selectBar',
  props: {
    model: {
      prop: 'seleted',
      event: 'change',
    },
    title: String,
    /**
     * 选择项：'全部'选项要添加属性 all: true
     * [{
     *    label:'', value:'value',
     *    children: [{label: '全部', value: '', all: true},...]},
     *    ...
     * ]
     */
    options: {
      type: Array,
      default: () => [],
    },
    // 是否开启多选
    multiple: {
      type: Boolean,
      default: false,
    },
    // 选中项
    select: {
      type: Array,
      default: () => [],
      validator(value) {
        if (!Array.isArray(value)) return
        return true
      },
    },
  },

  data() {
    return {
      selected1Index: [], // 一级选项选中项索引
      selected2Index: [], // 二级选项选中项索引
      selected: this.select, // 选中项
      innerOptions: [],
      currSelector: null, // 当前存在子选项的选项
    }
  },
  watch: {
    selected(val) {
      // console.log('selected', val)
      // const option = this.multiple ? val : val[0]
      this.$emit('update:select', val)
      this.$emit('update', val)
    },
    options: {
      handler(val) {
        this.innerOptions = deepClone(val)
        this.saveChildAll()
      },
      immediate: true,
    },
  },
  created() {
    this.initSelect(this.selected)
  },
  methods: {
    // 初始化选择
    initSelect(initialOpt = []) {
      if (!Array.isArray(initialOpt)) return
      initialOpt.forEach((item) => {
        // 查一级
        const index = this.innerOptions.findIndex((opt) => opt.value == item.value && opt.label == item.label)
        if (index >= 0) {
          this.selected1Index.push(index)
          this.selected.push(item)
          return
        }
        // 查二级
        this.innerOptions.findIndex((parent) => {
          if (parent.children) {
            const child = parent.children.find((child) => child.value == item.value && child.label == item.label)
            if (child) {
              parent.count ? parent.count++ : (parent.count = 1)
              this.selected.push(child)
            }
          }
        })
      })
    },
    // 一级选项选择
    selectParent(parent, index) {
      const selectedIndex = this.selected1Index.indexOf(index)
      const isSelected = selectedIndex >= 0

      this.currSelector = null
      // 选择全部
      if (parent.all) {
        this.selected1Index = [index]
        this.selected = [parent]
        this.clearCount()
        return
      }
      if (!this.multiple) {
        // 单选
        this.selected1Index = [index]
        // 存在二级选项
        if (parent.children) {
          this.currSelector = parent
        } else {
          this.selected2Index = []
          this.clearCount()
          this.selected = [parent]
        }
      } else {
        // 多选
        // 存在二级选项
        if (parent.children) {
          this.selected2Index = []
          this.currSelector = parent
          this.showCurrActiveChild()
          if (isSelected) return
          this.selected1Index.push(index)
          return
        }
        // 已选中
        if (isSelected) {
          this.selected1Index.splice(selectedIndex, 1)
          this.clearOption(parent)
          return
        }
        // clear 一级 '全部'
        this.clearParentAll()
        this.selected1Index.push(index)
        this.selected.push(parent)
      }
    },
    // 二级选项选择
    selectChild(child, index, parent) {
      const selectedIndex = this.selected2Index.indexOf(index)
      const isSelected = selectedIndex >= 0
      if (!this.multiple) {
        // 单选
        this.selected2Index = [index]
        this.selected = [child]
        this.clearCount()
        this.checkCount(parent)
      } else {
        // 多选
        // clear 一级 '全部'
        this.clearParentAll()
        // 选择 '全部'
        if (child.all) {
          const allIndex = this.selected.findIndex((item) => item.all && item.value == child.value)
          if (allIndex >= 0) return
          this.selected2Index = [index]
          this.selected.push(child)
          // clear other child
          const otherChildren = parent.children.filter((item) => !item.all)
          this.clearOption(otherChildren)
          this.checkCount(parent)
          return
        }
        // 选择其他
        // clear 当前 二级 '全部'
        const allOption = parent.children.filter((item) => item.all)
        this.clearOption(allOption)
        const allIndex = parent.children.findIndex((item) => item.all)
        const allIdx = this.selected2Index.findIndex((item) => item == allIndex)
        if (allIdx >= 0) {
          this.selected2Index.splice(allIdx, 1)
        }
        if (isSelected) {
          this.selected2Index.splice(selectedIndex, 1)
          this.clearOption(child)
          this.checkCount(parent)
          return
        }
        this.selected2Index.push(index)
        this.selected.push(child)
        this.checkCount(parent)
      }
    },
    // 从选中值清除选项
    clearOption(option) {
      if (Array.isArray(option)) {
        option.forEach((opt) => {
          const index = this.selected.findIndex((item) => item.value === opt.value)
          if (index >= 0) {
            this.selected.splice(index, 1)
          }
        })
      } else {
        const index = this.selected.findIndex((item) => item.value === option.value)
        if (index >= 0) {
          this.selected.splice(index, 1)
        }
      }
    },
    // 清除一级选项 '全部'
    clearParentAll() {
      const allIndex = this.selected.findIndex((item) => item.all && this.isNotChildAll(item))
      if (allIndex >= 0) {
        this.selected1Index.splice(allIndex, 1)
        this.selected.splice(allIndex, 1)
      }
    },
    // 保存所有二级'全部'选项
    saveChildAll() {
      this.childAllOption = this.innerOptions
        .filter((item) => item.children)
        .map((item) => item.children)
        .reduce((acc, curr) => {
          acc = acc.concat(curr)
          return acc
        }, [])
    },
    // 判断当前选项是否是二级选项中的'全部'选项
    isNotChildAll(opt) {
      const res = this.childAllOption.find((item) => item.value == opt.value)
      if (!res) return true
    },
    // 显示当前二级激活的选项
    showCurrActiveChild() {
      if (!this.currSelector) return
      const children = this.currSelector.children
      children.forEach((child, index) => {
        const temp = this.selected.find((item) => item.value == child.value)
        if (temp) this.selected2Index.push(index)
      })
    },
    // 计算各一级选项选中的二级选项数量
    checkCount(opt) {
      opt.count = this.selected2Index.length
    },
    clearCount() {
      this.innerOptions.forEach((item) => {
        if (item.count) item.count = 0
      })
    },
    // 往seleted push 选项 (供外部调用)
    pushSelected(opt = {}, isClearAll = false) {
      if (isClearAll) {
        this.selected1Index = []
        this.selected2Index = []
        this.selected.splice(0, this.selected.length - 1, opt)
        return
      }
      this.selected.push(opt)
    },
    clearAll() {
      if (this.selected && this.selected.length) {
        this.selected = []
        this.clearCount()
      }
      this.selected1Index = []
      this.selected2Index = []
      this.currSelector = null
    },
  },
}
</script>

<style lang="less" scoped>
@blue: #238ce8;

@red: #fa7272;

@orange: #ff8d52;

@green: #00bc00;

@textDark: #35414d;

@textLight: #6b8299;

@textDefault: #acb3ba;
.selectBar {
  font-size: 14px;
  display: flex;
  align-items: flex-start;
  user-select: none;
  padding: 10px;
  background-color: #fff;
  .title {
    width: 90px;
    min-width: 90px;
    white-space: nowrap;
    color: @textLight;
    height: 40px;
    line-height: 40px;
  }
  .select-wrap {
    // max-width: 960px;
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    .select-item {
      display: inline-block;
      white-space: nowrap;
      color: @textDark;
      cursor: pointer;
    }
    .select-1 {
      display: flex;
      flex-wrap: wrap;
      .slot {
        display: flex;
        align-items: center;
      }
      .select-item {
        height: 40px;
        line-height: 40px;
        padding: 0 15px;
        min-width: 80px;
        text-align: center;
        &.active {
          color: @blue;
        }
        &.current {
          border: 1px solid @blue;
          border-bottom: #fff;
          background: #fff;
          z-index: 1;
        }
        .badge {
          display: inline-block;
          width: 16px;
          height: 16px;
          line-height: 16px;
          background-color: @blue;
          border-radius: 50%;
          color: #fff;
          font-size: 12px;
          text-align: center;
        }
      }
    }
    .select-2 {
      margin-top: -1px;
      border-top: 1px solid @blue;
      .select-item {
        height: 30px;
        line-height: 30px;
        padding: 0 10px;
        margin: 5px;
        min-width: 70px;
        text-align: center;
        border-radius: 4px;
        &.active {
          color: #fff;
          background-color: @blue;
        }
      }
    }
  }
}
</style>
