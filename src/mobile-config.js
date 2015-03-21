App.info({
  id: 'remcoder.film1.on.demand.gids',
  name: 'Film1 On Demand Gids',
  description: 'Film1 On Demand Gids',
  author: 'Remco Veldkamp',
  email: 'remcoder@gmail.com',
  website: 'http://realstuffforabstractpeople.com',
  version: '1.0.0'
});

App.icons({
  // android_ldpi : '' // unessecary according to docs http://developer.android.com/design/style/iconography.html
  android_mdpi : 'app-icons/icon-mdpi.png', // base 48dp icon
  android_hdpi : 'app-icons/icon-hdpi.png',
  android_xhdpi : 'app-icons/icon-xhdpi.png'
});

App.launchScreens({
  android_ldpi_portrait : '',
  android_ldpi_landscape : '',
  android_mdpi_portrait : '',
  android_mdpi_landscape : '',
  android_hdpi_portrait : '',
  android_hdpi_landscape : '',
  android_xhdpi_portrait : 'resources/splash/splash-dark-720x1280.png',
  android_xhdpi_landscape : ''
});

App.accessRule('http://www.film1.nl/*');
