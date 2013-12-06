/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013 Sébastien CAPARROS (FileLoader.js)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

window.FileLoader = (function() {
	"use strict";
	
	// TODO being able to use this script with a webworker (and with importScripts)
	
	var urlToAbsolute = function(url) {
		var link = document.createElement("a");
		link.href = url;
		return link.href;
	};
	
	/**
	 * Returns a String from an array containing byte values
	 * @param Array(int) containing bytes list
	 * @return String From the bytes array. Also converts extended ASCII bytes.
	 */
	var byteArrayToString = function(array) {
		var s = "";
		for(var i = 0 ; i < array.length; i++) {
			s += String.fromCharCode(array[i] + (array[i] <= 127 ? 0 : 0x67));
		}
		return s;
	};
	
	/**
	 * Creates a blob url from the file bytes
	 * @param Object File description (@see readTarFile return)
	 * @param String (optional) The file mime type
	 * @return String A blob url to the file, with some information helpful for debugging
	 */
	var fileToBlobURL = function(file, mimeType) {
		// Fragment is not supported in blob urls by major browsers :( http://www.w3.org/TR/FileAPI/#ABNFForBlob
		//return URL.createObjectURL(new Blob([file.bytes])) + "#FileLoader.js/" + file.name;
		return URL.createObjectURL(new Blob([file.bytes], (mimeType ? {type: mimeType} : {})));
	};
	
	/**
	 * Reads a binary tar file, and returns files contained into it
	 * @param Uint8Array(int) The tar file bytes
	 * @return Uint8Array(Object) The files contained into the tar archive. The attributes of the objects are : 
	 * - name  : full path of the file into the archive, as a String
	 * - time  : Last file edition time, as a Date
	 * - bytes : bytes of the file, as a Uint8Array
	 */
	var readTarFile = function(content) {
		var files = [];
		var fileOffset = 0;
		while(fileOffset < content.length) {
			// Ignoring NUL blocks at the end of the file and directories (type "5")
			if(content[fileOffset] != 0 && content[fileOffset + 156] != "5".charCodeAt(0)) {
				var fileLength = parseInt(
					String.fromCharCode.apply(
						String,
						content.subarray(
							fileOffset + 124,
							fileOffset + 136
						)
					).replace(/[\0\s]/g, ""),
					8
				);
				
				var fileTime = new Date();
				fileTime.setTime(
					parseInt(
						byteArrayToString(
							content.subarray(
								fileOffset + 136,
								fileOffset + 148
							)
						).replace(/[\0\s]/g, ""),
						8
					) * 1000
				);
				
				files.push({
					name: byteArrayToString(
						content.subarray(
							fileOffset,
							fileOffset + 100
						)
					).replace(/[\0]/g, ""),
					time: fileTime,
					bytes: content.subarray(
						fileOffset + 512,
						fileOffset + 512 + fileLength
					)
				});
				
				fileOffset += fileLength;
			}
			
			// Going to next file
			fileOffset += 512;
			if(fileOffset % 512 > 0) fileOffset += 512 - fileOffset % 512;
		}
		
		return files;
	};
	
	/**
	 * Format of url referencing to a FileLoader archive
	 * URLs = "data:FileLoader.js,<archive url>,<file path in archive>"
	 */
	var fileLoaderUrlFormat = /data:FileLoader\.js,([^,]+),(.*)/;
	var fileLoaderUrlFormatInCss = /^url\(["']*data:FileLoader\.js,([^,]+),(.*)["']*\)$/;
	
	/**
	 * List of HTML attributes that can be urls to replace with a document in the archive
	 */
	var documentAttributesContainingURLs = ["src", "href"];
	
	/**
	 * Replaces urls in the given document by files in archives
	 */
	var replaceURLsInDocument = function(doc) {
		// Looping on all elements of the document to replace urls
		Array.prototype.forEach.call(
			doc.getElementsByTagName("*"),
			function(element) {
				for(var i = 0 ; i < documentAttributesContainingURLs.length ; i++) {
					var attributeName = documentAttributesContainingURLs[i];
					
					// Getting attribute value, if set
					var url = element.getAttribute(attributeName);
					if(url != null) {
						var urlMatching = fileLoaderUrlFormat.exec(url);
						if(urlMatching != null) {
							// If the url matches the format, replacing it with the corresponding blob url
							new FileLoader(urlMatching[1], function() {
								var elementURL = this.getURL(urlMatching[2]);
								if(elementURL != null) element[attributeName] = elementURL;
							});
						}
					}
				}
			}
		);
		
		// Looping on all stylesheets of the document to replace urls in it
		Array.prototype.forEach.call(window.document.styleSheets, function(styleSheet) {
			replaceURLsInStyleSheets(styleSheet);
		});
	};
	
	/**
	 * Replaces urls in the given stylesheeet by files in archives
	 */
	var replaceURLsInStyleSheets = function(styleSheet) {
		Array.prototype.forEach.call(styleSheet.cssRules, function(cssRule) {
			Array.prototype.forEach.call(cssRule.style, function(propertyName) {
				// If the property contains a url rule matching the format, replacing it with the corresponding blob url
				var ruleMatching = fileLoaderUrlFormatInCss.exec(cssRule.style.getPropertyValue(propertyName));
				if(ruleMatching != null) {
					new FileLoader(ruleMatching[1], function() {
						var ruleURL = this.getURL(ruleMatching[2]);
						if(ruleURL != null) cssRule.style.setProperty(propertyName, "url(" + ruleURL + ")");
					});
				}
			});
		});
	};
	
	/**
	 * Apply a filters and format the content of the files
	 * @param Array(Object) File list (@see readTarFile return)
	 * @param String|RegExp|null The file(s) searched. null = all files. String = one file. RegExp = multiple files.
	 * @param Function An action to apply on each file matching the filter.
	 * @param Additional parameter for some object types (image onload for example)
	 * @return Object If filter is a String, the file content after action (or null if the file doesn't exists).
	 * Else, an Array containing matching file contents after action.
	 */
	var formatAndFilterFiles = function(files, filter, action, onLoad) {
		if(filter == null) {
			// No filter, getting all files
			return files.map(function(file) {
				return action(file, onLoad || null);
			});
		} else if(filter instanceof RegExp) {
			// Getting files matching the RegExp
			return files.filter(function(file) {
				return filter.test(file.name);
			}).map(function(file) {
				return action(file, onLoad || null);
			});
		} else if(filter instanceof String || typeof(filter) == "string") {
			// Getting a single file (if exists)
			var ret = files.filter(function(file) {
				return file.name == filter;
			}).map(function(file) {
				return action(file, onLoad || null);
			});
			return ret.length == 0 ? null : ret[0];
		} else {
			throw new Error("Filter must be a RegExp, String or null value.");
		}
	};
	
	var archives = {};
	
	/**
	 * FileLoader constructor.
	 * @param String The HTTP path to the tar archive.
	 * @param Function Called after loading the tar file, and when it's files are ready to use.
	 */
	var FL = function(fileName, onLoadCallBack) {
		var absoluteFileName = urlToAbsolute(fileName);
		
		var loader = function() {
			var self = this;
			
			if(typeof(archives[absoluteFileName]) == "undefined") {
				// Initializing archive
				var archive = archives[absoluteFileName] = {
					files: null,
					onLoadCallBacks: [onLoadCallBack],
					isLoaded: false
				};
				
				// Loading tar file with an ajax request
				var xhr = new XMLHttpRequest();
				xhr.open("GET", absoluteFileName, true);
				xhr.responseType = "arraybuffer";
				xhr.onreadystatechange = function() {
					if(this.readyState == this.DONE) {
						if(xhr.status == 200) {
							var byteArray = new Uint8Array(this.response);
							archive.files = readTarFile(byteArray);
							archive.onLoadCallBacks.forEach(function(callBack) {
								callBack.call(self);
							});
							archive.isLoaded = true;
						} else {
							throw new Error("Error HTTP " + xhr.status + " when loading tar file : " + fileName);
						}
					}
				};
				xhr.send(null);
			} else {
				// Archive has already been loaded by another instance
				var archive = archives[absoluteFileName];
				
				if(archive.isLoaded) {
					// Archive already loaded : immediately calling function
					onLoadCallBack.call(this);
				} else {
					// Archive is loading : adding function to stack
					archive.onLoadCallBacks.push(onLoadCallBack);
				}
			}
		};
		
		var JSDebugUrlTransformer = null;
		
		/**
		 * Loads JS files found in the archive from the network instead of memory.
		 * This is only useful to be able to fully use the browser debuggers.
		 * @param Function Takes the path of a file in the archive and returns the equivalent HTTP url.
		 */
		loader.prototype.enableJSDebugMode = function(urlTransformer) {
			JSDebugUrlTransformer = urlTransformer;
		};
		
		/**
		 * Imports JS file(s) from the archive and adds it to the page header
		 * @param String|RegExp|null The file(s) searched. null = all files. String = one file. RegExp = multiple files.
		 */
		loader.prototype.importJS = function(filter) {
			return formatAndFilterFiles(
				archives[absoluteFileName].files,
				filter || /.*\.js$/,
				function(file) {
						var script = document.createElement("script");
						script.type = "text/javascript";
						script.async = false;
						script.src = JSDebugUrlTransformer == null ? fileToBlobURL(file, "text/javascript") : JSDebugUrlTransformer(file.name);
						document.head.appendChild(script);
						file.hasAlreadyBeenImportedAsJS = true;
					}
				}
			);
		};
		
		/**
		 * Imports CSS file(s) from the archive and adds it to the page header
		 * @param String|RegExp|null The file(s) searched. null = all files. String = one file. RegExp = multiple files.
		 */
		loader.prototype.importCSS = function(filter) {
			return formatAndFilterFiles(
				archives[absoluteFileName].files,
				filter || /.*\.css$/,
				function(file) {
					if(!file.hasAlreadyBeenImportedAsCSS) {
						var link = document.createElement("link");
						link.setAttribute("rel", "stylesheet");
						link.setAttribute("type", "text/css");
						link.setAttribute("href", fileToBlobURL(file, "text/css"));
						document.head.appendChild(link);
						file.hasAlreadyBeenImportedAsCSS = true;
						link.addEventListener("load", function() {
							// When styleSheet is ready, we have to replace urls in it
							replaceURLsInStyleSheets(this.sheet);
						});
					}
				}
			);
		};
		
		/**
		 * Imports HTML file(s) from the archive and adds it to the page header
		 * @param String|RegExp|null The file(s) searched. null = all files. String = one file. RegExp = multiple files.
		 */
		loader.prototype.importHTML = function(filter) {
			return formatAndFilterFiles(
				archives[absoluteFileName].files,
				filter || /.*\.html$/,
				function(file) {
					if(!file.hasAlreadyBeenImportedAsHTML) {
						var link = document.createElement("link");
						link.setAttribute("rel", "import");
						link.setAttribute("href", fileToBlobURL(file, "text/html"));
						
						document.head.appendChild(link);
						file.hasAlreadyBeenImportedAsHTML = true;
						link.addEventListener("load", function() {
							// When document is ready, we have to replace urls in it
							replaceURLsInDocument(this.import);
						});
					}
				}
			);
		};
		
		/**
		 * Returns image(s) from the archive
		 * @param String|RegExp|null The file(s) searched. null = all files. String = one file. RegExp = multiple files.
		 * @param Function to call on image(s) load
		 * @return Image|Array(Image)
		 */
		loader.prototype.getImage = function(filter, onLoad) {
			return formatAndFilterFiles(
				archives[absoluteFileName].files,
				filter || /.*\.(png|gif|jpeg|jpg|svg|bmp|tiff)$/,
				function(file) {
					var image = new Image();
					if(onLoad) {
						image.addEventListener("load", onLoad);
					}
					image.src = fileToBlobURL(file);
					return image;
				}
			);
		};
		
		/**
		 * Returns last change time of file(s) from the archive
		 * @param String|RegExp|null The file(s) searched. null = all files. String = one file. RegExp = multiple files.
		 * @return Date|Array(Date)
		 */
		loader.prototype.getTime = function(filter) {
			return formatAndFilterFiles(
				archives[absoluteFileName].files,
				filter || null,
				function(file) {
					return file.time;
				}
			);
		};
		
		/**
		 * Returns blob url(s) to access to the file(s)
		 * @param String|RegExp|null The file(s) searched. null = all files. String = one file. RegExp = multiple files.
		 * @return String|Array(String)
		 */
		loader.prototype.getURL = function(filter) {
			return formatAndFilterFiles(
				archives[absoluteFileName].files,
				filter || null,
				function(file) {
					return fileToBlobURL(file);
				}
			);
		};
		
		/**
		 * Returns Text content from file(s)
		 * @param String|RegExp|null The file(s) searched. null = all files. String = one file. RegExp = multiple files.
		 * @return String|Array(String)
		 */
		loader.prototype.getText = function(filter) {
			return formatAndFilterFiles(
				archives[absoluteFileName].files,
				filter || null,
				function(file) {
					return byteArrayToString(file.bytes);
				}
			);
		};
		
		/**
		 * Returns file(s) as a Blob
		 * @param String|RegExp|null The file(s) searched. null = all files. String = one file. RegExp = multiple files.
		 * @return Blob|Array(Blob)
		 */
		loader.prototype.getBlob = function(filter) {
			return formatAndFilterFiles(
				archives[absoluteFileName].files,
				filter || null,
				function(file) {
					return new Blob([file.bytes]);
				}
			);
		};
		
		/**
		 * Returns file(s) as a bytes
		 * @param String|RegExp|null The file(s) searched. null = all files. String = one file. RegExp = multiple files.
		 * @param Uint8Array|Array(Uint8Array)
		 */
		loader.prototype.getBytes = function(filter) {
			return formatAndFilterFiles(
				archives[absoluteFileName].files,
				filter || null,
				function(file) {
					return file.bytes;
				}
			);
		};
		
		/**
		 * Returns file(s) as a XML document
		 * @param String|RegExp|null The file(s) searched. null = all files. String = one file. RegExp = multiple files.
		 * DOMDocument|Array(DOMDocument)
		 */
		loader.prototype.getXML = function(filter) {
			return formatAndFilterFiles(
				archives[absoluteFileName].files,
				filter || /.*\.xml$/,
				function(file) {
					return (new DOMParser()).parseFromString(byteArrayToString(file.bytes), "application/xml");
				}
			);
		};
		
		/**
		 * Returns file(s) as parsed JSON
		 * @param String|RegExp|null The file(s) searched. null = all files. String = one file. RegExp = multiple files.
		 * @return Object|Array(Object)
		 */
		loader.prototype.getJSON = function(filter) {
			return formatAndFilterFiles(
				archives[absoluteFileName].files,
				filter || /.*\.json$/,
				function(file) {
					return JSON.parse(byteArrayToString(file.bytes));
				}
			);
		};
		
		return new loader();
	};
	
	// Handling images urls in current document
	window.addEventListener("load", function() {
		replaceURLsInDocument(window.document);
	});
	
	return FL;
})();
