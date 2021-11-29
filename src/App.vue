<template>
<div id="app" >
  <notifications/>
  <div id="container">
    <div id="details">
      <h1>Ad4m Neighbourhood Link Viz</h1>
      <h4>Please ensure your ad4m agent is unlocked before loading. This application also expects ad4m graphql endpoint to be available at: ws://localhost:4000/graphql</h4>
    </div>
    <div id="config">
      Connect Link Elements
      <label class="switch">
        <input @click="toggleLinkElementConnect" type="checkbox">
        <span class="slider round"></span>
      </label>
      <button class="button" @click="load">Load</button>
    </div>
  </div>
  <network ref="network" class="wrapper" 
  :nodes="nodes"
  :edges="edges"
  :options="options">
  </network>
</div>
</template>

<script>
import "vue-vis-network/node_modules/vis-network/dist/vis-network.css";
import { ad4mClient } from "./main";
import { v4 as uuidv4 } from 'uuid';

export default {
  name: 'App',
  methods: {
    toggleLinkElementConnect() {
      this.connectLinkElements = !this.connectLinkElements;
      this.nodes = [];
      this.edges = [];
      this.load();
    },
    async load() {
      this.$notify({type: 'warn', text: 'Loading perspective data'})
      const startTime = performance.now()
      await this.getPerspectiveNodesAndMetaEdges();
      const endTime = performance.now()
      this.$notify({type: 'success', text: `Perspective data loaded in ${endTime-startTime}ms`})
    },
    loadPerspectiveNode(perspective) {
      const perspectiveNode = {
        id: perspective.uuid,
        label: perspective.name + "-Perspective",
        widthConstraint: 150,
        shape: 'database'
      };
      this.nodes.push(perspectiveNode);
    },
    loadNeighbourhoodNode(perspective) {
      const neighbourhoodLanguage = perspective.neighbourhood.linkLanguage;
      //Create perspective node
      const perspectiveNode = {
        id: perspective.sharedUrl,
        label: perspective.name + "-Neighbourhood",
        widthConstraint: 150,
        shape: 'database',
        color: "#FF0013"
      };
      //Create language node
      const neighbourhoodLanugageNode = {
        id: neighbourhoodLanguage,
        label: neighbourhoodLanguage,
        widthConstraint: 150
      }
      if (this.nodes.filter(node => node.id === perspective.sharedUrl).length == 0) this.nodes.push(perspectiveNode);
      this.nodes.push(neighbourhoodLanugageNode);
    },
    loadMetaLinks(perspective) {
      const neighbourhoodMetaLinks = perspective.neighbourhood.meta.links;
      const metaLinkNode = uuidv4();
      const metaLinks = {
        id: metaLinkNode,
        label: "metaLinks",
        shape: 'database',
        group: "metaLinks",
        widthConstraint: 100
      }
      this.nodes.push(metaLinks);
      this.edges.push({
        from: perspective.sharedUrl,
        to: metaLinkNode,
        label: "metaLinks"
      })
      //Add the meta links to the network
      for (const metaLink of neighbourhoodMetaLinks) {
        const link = metaLink.data;
        const sourceId = uuidv4();
        this.nodes.push({
          id: sourceId,
          label: link.source,
          widthConstraint: 150,
          group: "metaLinks"
        })
        this.edges.push({
          from: metaLinkNode,
          to: sourceId,
          label: "containsLink"
        })
        //Add a node for target data
        //We always add a node here since we dont want perspectives to share link targets
        const targetId = uuidv4();
        this.nodes.push({
          id: targetId,
          label: link.target,
          widthConstraint: 150,
          group: "metaLinks"
        })
        this.edges.push({
          from: sourceId,
          to: targetId,
          label: link.predicate
        })
      }
    },
    loadConnectedMetaLinks(perspective) {
      const neighbourhoodMetaLinks = perspective.neighbourhood.meta.links;
      const metaLinksId = uuidv4();
      const metaLinksNode = {
        id: metaLinksId,
        label: "metaLinks",
        shape: 'database',
        group: "metaLinks",
        widthConstraint: 100
      }
      this.nodes.push(metaLinksNode);
      this.edges.push({
        from: perspective.sharedUrl,
        to: metaLinksNode.id,
        label: "metaLinks"
      })
      //Add the meta links to the network
      for (const metaLink of neighbourhoodMetaLinks) {
        const link = metaLink.data;
        const inferredConnections = neighbourhoodMetaLinks.filter(linkF => linkF.data.target == link.source);
        const sourceNode = {
          id: link.source+perspective.sharedUrl,
          label: link.source,
          widthConstraint: 150,
          group: "metaLinks"
        };
        const targetNode = {
          id: link.target+perspective.sharedUrl,
          label: link.target,
          widthConstraint: 150,
          group: "metaLinks"
        };

        if (this.nodes.filter(node => node.id == sourceNode.id).length == 0) this.nodes.push(sourceNode)
        if (this.nodes.filter(node => node.id == targetNode.id).length == 0) this.nodes.push(targetNode)
        if (inferredConnections.length == 0) {
          this.edges.push({
            from: metaLinksNode.id,
            to: sourceNode.id,
            label: "containsLink"
          })
        }
        this.edges.push({
          from: sourceNode.id,
          to: targetNode.id,
          label: link.predicate
        })
      }
    },
    async loadConnectedLinks(perspective, isNeighbourhood) {
      //Now start to look for the actual links on the link language
      const linkLanguageLinksNode = uuidv4(); 
      if (isNeighbourhood) {
        const linkLanguageLinks = {
          id: linkLanguageLinksNode,
          label: "linkLanguageLinks",
          shape: 'database',
          group: "linkLanguageLink",
          widthConstraint: 100
        }
        this.nodes.push(linkLanguageLinks);
        this.edges.push({
          from: perspective.sharedUrl,
          to: linkLanguageLinksNode,
          label: "linkLanguageLinks"
        })
        this.edges.push({
          from: linkLanguageLinksNode,
          to: perspective.neighbourhood.linkLanguage,
          label: "usesLanguage"
        })
      }
      const links = await ad4mClient.perspective.queryLinks(perspective.uuid, {});
      
      let from;
      if (isNeighbourhood) {
        from = linkLanguageLinksNode
      } else {
        from = perspective.uuid;
      }

      for (const link of links) {
        const linkData = link.data;
        const inferredConnections = links.filter(linkF => linkF.data.target == linkData.source);
        const sourceNode = {
          id: linkData.source+perspective.uuid,
          label: linkData.source,
          widthConstraint: 150,
          group: "linkLanguageLink",
          isSource: true
        }
        let targetNode;
        if (linkData.target.includes("neighbourhood://")) {
          targetNode = {
            id: linkData.target,
            label: linkData.target,
            widthConstraint: 150,
            group: "linkLanguageLink",
            shape: 'database',
            color: '#FF0013'
          }
        } else {
          targetNode = {
            id: linkData.target+perspective.uuid,
            label: linkData.target,
            widthConstraint: 150,
            group: "linkLanguageLink"
          }
        }
        const edge = {
          from: sourceNode.id,
          to: targetNode.id,
          label: linkData.predicate,
        }
        if (this.nodes.filter(node => node.id == sourceNode.id).length == 0) this.nodes.push(sourceNode)
        if (this.nodes.filter(node => node.id == targetNode.id).length == 0) this.nodes.push(targetNode)
        if (inferredConnections.length == 0) {
          this.edges.push({
            from: from,
            to: sourceNode.id,
            label: "containsLink"
          })
        }
        this.edges.push(edge)
      }
    },
    async loadLinks(perspective, isNeighbourhood) {
      //Now start to look for the actual links on the link language
      const linkLanguageLinksNode = uuidv4(); 
      if (isNeighbourhood) {
        const linkLanguageLinks = {
          id: linkLanguageLinksNode,
          label: "linkLanguageLinks",
          shape: 'database',
          group: "linkLanguageLink",
          widthConstraint: 100
        }
        this.nodes.push(linkLanguageLinks);
        this.edges.push({
          from: perspective.sharedUrl,
          to: linkLanguageLinksNode,
          label: "linkLanguageLinks"
        })
        this.edges.push({
          from: linkLanguageLinksNode,
          to: perspective.neighbourhood.linkLanguage,
          label: "usesLanguage"
        })
      }
      const links = await ad4mClient.perspective.queryLinks(perspective.uuid, {});
      
      let from;
      if (isNeighbourhood) {
        from = linkLanguageLinksNode
      } else {
        from = perspective.uuid;
      }

      for (const link of links) {
        const linkData = link.data;
        const sourceId = uuidv4();
        let targetId = uuidv4();
        const sourceNode = {
          id: sourceId,
          label: linkData.source,
          widthConstraint: 150,
          group: "linkLanguageLink",
          isSource: true
        }
        let targetNode;
        let edge;
        if (linkData.target.includes("neighbourhood://")) {
          targetId = linkData.target;
          targetNode = {
            id: linkData.target,
            label: linkData.target,
            widthConstraint: 150,
            group: "linkLanguageLink",
            shape: 'database',
            color: '#FF0013'
          }
        } else {
          targetNode = {
            id: targetId,
            label: linkData.target,
            widthConstraint: 150,
            group: "linkLanguageLink"
          }
        }
        edge = {
          from: sourceId,
          to: targetId,
          label: linkData.predicate,
        }
        this.nodes.push(sourceNode)
        this.nodes.push(targetNode)
        this.edges.push({
          from: from,
          to: sourceId,
          label: "containsLink"
        })
        this.edges.push(edge)
      }
    },
    async getPerspectiveNodesAndMetaEdges() {
      console.log("getPerspectiveNodesAndMetaEdges()");
      const perspectives = await ad4mClient.perspective.all();
      console.log("Got perspectives: ", perspectives);
      for (const perspective of perspectives) {
        if (perspective.neighbourhood) {
          //Load the neighbourhood data
          this.loadNeighbourhoodNode(perspective);

          if (this.connectLinkElements) {
            //Load the meta data
            this.loadConnectedMetaLinks(perspective);
            await this.loadConnectedLinks(perspective, true);
          } else {
            //Load the meta data
            this.loadMetaLinks(perspective);
            await this.loadLinks(perspective, true)
          }
        } else {
          this.loadPerspectiveNode(perspective);
          if (this.connectLinkElements) {
            await this.loadConnectedLinks(perspective, false);
          } else {
            await this.loadLinks(perspective, false)
          }
        }
      }
      this.edges = this.edges.sort(() => Math.random() - 0.5);
      this.nodes = this.nodes.sort(() => Math.random() - 0.5);

      Number.prototype.pad = function(size) {
          var s = String(this);
          while (s.length < (size || 2)) {s = "0" + s;}
          return s;
      }

      var padsize = this.nodes.length.toString().length;

      this.nodes.forEach ( node => {

        node.key = this.nodes.indexOf(node).pad(padsize);

        var edge = this.edges.find(e => e.to == node.id);
        while (edge) {

          var parent = this.nodes.find(n => n.id == edge.from);
          if (parent) {

              node.key = "" + this.nodes.indexOf(parent).pad(padsize) + node.key;
          }

          edge = this.edges.find(e => e.to == parent.id);
        }
      });  

      this.nodes = this.nodes.sort( (a,b) => {
        if (a.key > b.key) return 1;
        if (a.key < b.key) return -1;
        return 0;
      });
    }
  },
  data() {
    return {
      connectLinkElements: false,
      nodes: [],
      edges: [],
      options: {
        groups: {
          linkLanguageLink: {color:{background:'#FF3366'}},
          metaLinks: {color:{background:'#33A1FF'}}
        },
        nodes: {
          borderWidth: 1
        },
        edges: {
          color: 'black'
        },
        physics: {
          hierarchicalRepulsion: {
            nodeDistance: 300,
            centralGravity: 0.0,
            springLength: 200,
            damping: 0.09,
            avoidOverlap: 1,
            springConstant: 0.001,
          },
          solver: 'hierarchicalRepulsion'
        },
        layout: {
          hierarchical: {
            enabled: true,
            levelSeparation: 350,
            nodeSpacing: 350,
            treeSpacing: 350,
            direction: 'UD',        // UD, DU, LR, RL
            sortMethod: 'directed'   // hubsize, directed
          }
        }
      }
    }
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  width: 100%;
  height: 100%;
}
#container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
.button {
  background-color: #4CAF50; /* Green */
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
}
#config {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
#details {
  flex-grow: 1;
}
.wrapper{
  min-height: 100vh;
  border: 1px solid black;
  background-color: #ccc;
  padding: 10px;
  height: 100vh;
}

/* The switch - the box around the slider */
.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>
