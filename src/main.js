import Vue from 'vue'
import App from './App.vue'

import { Network } from "vue-vis-network";
import Notifications from 'vue-notification'
import { ApolloClient, InMemoryCache } from "@apollo/client";
import { WebSocketLink } from "@apollo/client/link/ws";
import { Ad4mClient } from '@perspect3vism/ad4m';

Vue.component('network', Network);
Vue.config.productionTip = false
Vue.use(Notifications)

new Vue({
  render: h => h(App),
}).$mount('#app')

export const apolloClient = new ApolloClient({
  link: new WebSocketLink({
    uri: `ws://localhost:4000/graphql`,
    options: {
      reconnect: true,
    },
  }),
  cache: new InMemoryCache({}),
  defaultOptions: {
    watchQuery: {
      errorPolicy: "ignore",
    },
    query: {
      errorPolicy: "all",
    },
  },
});
export const ad4mClient = new Ad4mClient(apolloClient);