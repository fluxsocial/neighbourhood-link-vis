import Vue from 'vue'
import App from './App.vue'
import { Network } from "vue-vis-network";

Vue.component('network', Network);

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
