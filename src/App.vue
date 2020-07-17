<template>
  <div id="app">
  <h2>Asana Webhook Console</h2>
    <div id="nav">
      <el-menu mode="horizontal" router>
          <el-menu-item index="home" :route="{ name:'Home' }">Home</el-menu-item>
          <el-menu-item index="about" :route="{ name:'About' }">About</el-menu-item>
      </el-menu>
    </div>
    <router-view/>
  </div>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}
</style>
