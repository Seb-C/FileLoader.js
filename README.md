FileLoader.js
=============

FileLoader.js is a library which allows you to load all your web app files into a single tarball archive.

Server side, you just need to put all your client stuff (scripts, images, xml, binary ...) into a single tar archive (you can also dynamically generate it).

Compressed tar archives (.tar.gz, .tar.bz ...) are currently not supported.

Browser support : up-to-date browsers, Internet Explorer >= 10.

Basic usage
-----------

```html
<!DOCTYPE html>
<html>
	<head>
		<script type="text/javascript" src="/js/FileLoader.js"></script>
		<script type="text/javascript">
			new FileLoader("content.tar", function() {
				// Imports all files in directory "css" with extension ".css"
				this.importCSS(/css\/.*\.css$/);
				
				// Importing all ".js" files in "js/lib"
				this.importJS(/js\/lib\/.*\.js$/);
				
				// Importing a single file
				this.importJS("www/js/main.js");
				
				// Importing all files with ".js" extension
				this.importJS();
				
				// Getting an Image object
				var myImage = this.getImage("www/images/foo.png");
				
				// Getting all images in "www/images/bar" with extension png or gif, and adding it to body
				var manyImages = this.getImage(/images\/bar\/.*\.(png|gif)/, function() {
					document.body.appendChild(this);
				});
				
				/*
				 * Also available : 
				 * this.importHTML(filter)
				 * this.getURL(filter);
				 * this.getTime(filter);
				 * this.getText(filter);
				 * this.getBlob(filter);
				 * this.getBytes(filter);
				 * this.getJSON(filter);
				 * this.getXML(filter);
				 */
			});
		</script>
	</head>
	<body>
		<a href="data:FileLoader.js,content.tar,www/foo/bar.html">Link to an html file into the archive</a>
		<img src="data:FileLoader.js,content.tar,www/images/baz.gif" alt="Some image" />
		<!--
			urls matching "data:FileLoader.js,<archive url>,<file path in archive>"
			are basically replaced in all "href" and "src" attributes in the page.
			You can also use it with "url()" in css files.
		-->
	</body>
</html>
```

Scripts & debuggers
-------------------
Because the browser debuggers won't show you the script names, and because it will not be able to memorize the breakpoints after a page refresh, you can use the debug method. It takes a single argument which is a method to translate a path into an archive to an HTTP url.

```javascript
this.enableJSDebugMode(function(path) {
	// "www/js/foo.js" in "bar.tar" ==> "/js/foo.js"
	return path.replace("www", "");
});
```


Real world example #1
=====================

Without FileLoader.js
---------------------

```html
<link rel="stylesheet" type="text/css" href="/css/main.css" />

<script type="text/javascript" src="/js/polyfills/requestAnimationFrame.js"></script>
<script type="text/javascript" src="/js/polyfills/fullscreen-api-polyfill.js"></script>
<script type="text/javascript" src="/js/polyfills/e5-shim.min.js"></script>
<script type="text/javascript" src="/js/polyfills/html5slider.js"></script>
<script type="text/javascript" src="/js/polyfills/cssfx.min.js"></script>
<script type="text/javascript" src="/js/polyfills/Canvas.js"></script>
<script type="text/javascript" src="/js/polyfills/Object.create.js"></script>

<script type="text/javascript" src="/js/lib/gl-matrix.min.js"></script>
<script type="text/javascript" src="/js/lib/seedrandom.js"></script>

<script type="text/javascript" src="/js/functions/misc.js"></script>
<script type="text/javascript" src="/js/functions/createWindow.js"></script>
<script type="text/javascript" src="/js/functions/splitSurface.js"></script>
<script type="text/javascript" src="/js/functions/confirmPopup.js"></script>
<script type="text/javascript" src="/js/functions/contextMenu.js"></script>

<script type="text/javascript" src="/js/singletons/Materials.js"></script>
<script type="text/javascript" src="/js/singletons/Models.js"></script>
<script type="text/javascript" src="/js/singletons/Screens.js"></script>
<script type="text/javascript" src="/js/singletons/Configuration.js"></script>
<script type="text/javascript" src="/js/singletons/LoginForm.js"></script>
<script type="text/javascript" src="/js/singletons/Controls.js"></script>
<script type="text/javascript" src="/js/singletons/TimerManager.js"></script>
<script type="text/javascript" src="/js/singletons/DesignerModels.js"></script>

<script type="text/javascript" src="/js/classes/MDArray.js"></script>
<script type="text/javascript" src="/js/classes/Clickable.js"></script>
<script type="text/javascript" src="/js/classes/Shader.js"></script>
<script type="text/javascript" src="/js/classes/World.js"></script>
<script type="text/javascript" src="/js/classes/Camera.js"></script>
<script type="text/javascript" src="/js/classes/Light.js"></script>
<script type="text/javascript" src="/js/classes/Entity.js"></script>
<script type="text/javascript" src="/js/classes/Particle.js"></script>
<script type="text/javascript" src="/js/classes/ParticleManager.js"></script>
<script type="text/javascript" src="/js/classes/LightManager.js"></script>
<script type="text/javascript" src="/js/classes/Mesh.js"></script>
<script type="text/javascript" src="/js/classes/ControlScreen.js"></script>
<script type="text/javascript" src="/js/classes/SpaceShip.js"></script>
<script type="text/javascript" src="/js/classes/ServerConnection.js"></script>
<script type="text/javascript" src="/js/classes/Timer.js"></script>
<script type="text/javascript" src="/js/classes/Designer.js"></script>
<script type="text/javascript" src="/js/classes/ResourceManager.js"></script>
<script type="text/javascript" src="/js/classes/SpaceContent.js"></script>
<script type="text/javascript" src="/js/classes/Animator.js"></script>

<script type="text/javascript" src="/js/models/spaceShip/Room.js"></script>
<script type="text/javascript" src="/js/models/spaceShip/Door.js"></script>
<script type="text/javascript" src="/js/models/spaceShip/Propeller.js"></script>
<script type="text/javascript" src="/js/models/spaceShip/Console.js"></script>
<script type="text/javascript" src="/js/models/space/Star.js"></script>
<script type="text/javascript" src="/js/models/space/Planet.js"></script>

<script type="text/javascript" src="/js/designerModels/Console.js"></script>
<script type="text/javascript" src="/js/designerModels/Door.js"></script>
<script type="text/javascript" src="/js/designerModels/ladder.obj.js"></script>
<script type="text/javascript" src="/js/designerModels/Propeller.js"></script>
<script type="text/javascript" src="/js/designerModels/shelf.obj.js"></script>
<script type="text/javascript" src="/js/designerModels/water_tank.obj.js"></script>
<script type="text/javascript" src="/js/designerModels/Window.js"></script>
<script type="text/javascript" src="/js/designerModels/power_station.obj.js"></script>

<script type="text/javascript" src="/js/screens/Propulsion.js"></script>

<script type="text/javascript" src="/js/main.js"></script>
```


With FileLoader.js
------------------

```html
<script type="text/javascript" src="/js/lib/FileLoader.js"></script>
<script type="text/javascript">
	window.FILES = new FileLoader("/content.tar", function() {
		this.importCSS(/css\/.*\.css$/);
		
		this.importJS(/js\/polyfills\/.*\.js$/);
		this.importJS(/js\/lib\/.*\.js$/);
		this.importJS(/js\/functions\/.*\.js$/);
		this.importJS(/js\/singletons\/.*\.js$/);
		this.importJS(/js\/classes\/.*\.js$/);
		this.importJS(/js\/models\/.*\.js$/);
		this.importJS(/js\/designerModels\/.*\.js$/);
		this.importJS(/js\/screens\/.*\.js$/);
		this.importJS(/main\.js$/);
	});
</script>
```

Real world example #2
=====================

Without FileLoader.js
---------------------

```javascript
var ajax = new XMLHttpRequest();
ajax.open("GET", "/objects/door.obj", false);
ajax.send(null);
if(ajax.readyState == ajax.DONE && ajax.status == 200) {
	var content = ajax.responseText;
	// ... Do some stuff with content
} else {
	throw new Error("File not found");
}
```

With FileLoader.js
------------------

```javascript
// NOTE : FILES is initialized in "Real world example #1"
var content = FILES.getText("www/objects/door.obj");
// ... Do some stuff with content
```

Real world example #3
=====================

Without FileLoader.js
---------------------

```javascript
var image = new Image();
image.addEventListener("load", function() {
	// Do something with image (this)
});
image.src = "/objects/textures/metal.png";
```

With FileLoader.js
------------------

```javascript
var image = FILES.getImage("/objects/textures/metal.png", function() {
	// Do something with image (this)
});
```
