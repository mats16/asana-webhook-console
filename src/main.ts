import Vue from 'vue'
import AsyncComputed from 'vue-async-computed'
import App from './App.vue'
import router from './router'

import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';

import Amplify from 'aws-amplify';
import '@aws-amplify/ui-vue';
// @ts-ignore
import aws_exports from './aws-exports';

Amplify.configure(aws_exports);

Vue.config.productionTip = false
Vue.use(AsyncComputed);
Vue.use(ElementUI);

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
