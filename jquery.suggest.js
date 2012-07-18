	
	/*
	 *	jquery.suggest 1.2 - 2007-09-02
	 *	
	 *	Uses code and techniques from following libraries:
	 *	1. http://www.dyve.net/jquery/?autocomplete
	 *	2. http://dev.jquery.com/browser/trunk/plugins/interface/iautocompleter.js	
	 *
	 *	All the new stuff written by Peter Vulgaris (www.vulgarisoip.com)	
	 *	Feel free to do whatever you want with this file
	 *
	 */
	
	(function($) {

		$.suggest = function(input, options) {

			function processKey(e) {
				
				// handling up/down/escape requires results to be visible
				// handling enter/tab requires that AND a result to be selected
				if ((/27$|38$|40$/.test(e.keyCode) && $results.is(':visible')) ||
					(/^13$|^9$/.test(e.keyCode) && getCurrentResult())) {
		            
		            if (e.preventDefault)
		                e.preventDefault();
					if (e.stopPropagation)
		                e.stopPropagation();

					e.cancelBubble = true;
					e.returnValue = false;
				
					switch(e.keyCode) {
	
						case 38: // up
							prevResult();
							break;
				
						case 40: // down
							nextResult();
							break;
	
						case 9:  // tab
						case 13: // return
							selectCurrentResult();
							break;
							
						case 27: //	escape
							$results.hide();
							break;
	
					}
					
				} else if ($input.val().length != prevLength) {

					if (timeout) 
						clearTimeout(timeout);
					
					$input.addClass('ac_searching');
					timeout = setTimeout(suggest, options.delay);
					
				}

				prevLength = $input.val().length;

			}
			
			
			function suggest() {
			
				var q = $input.val();

				if (q.length >= options.minchars) {
					
					cached = checkCache(q);
					
					if (cached) {
					
						displayItems(cached['items']);
						$input.removeClass('ac_searching');
						
					} else {
					
						$.get(options.source, {q: q}, function(txt) {

							$results.hide();
							
							var items = parseTxt(txt, q);

							// sometimes RPC response comes too late
							// we still want to cache the response
							// but don't display
							if ($input.val() == q)
								displayItems(items);
								
							addToCache(q, items, txt.length);
							
							$input.removeClass('ac_searching');
					
						});
						
					}
					
				} else {
				
					$results.hide();
					$input.removeClass('ac_searching');
					
					// don't send anything to form,
					// if no option is possibly selected
					$hiddenInput
						.val('')
						.triggerHandler('change');					
					
					if (!q && options.onSelect)
						options.onSelect.apply($input[0], ['']);
					
				}

			}
						
			function checkCache(q) {

				for (var i = 0; i < cache.length; i++)
					if (cache[i]['q'] == q) {
						cache.unshift(cache.splice(i, 1)[0]);
						return cache[0];
					}
				
				return false;
			
			}
			
			function addToCache(q, items, size) {

				while (cache.length && (cacheSize + size > options.maxCacheSize)) {
					var cached = cache.pop();
					cacheSize -= cached['size'];
				}
				
				cache.push({
					q: q,
					size: size,
					items: items
					});
					
				cacheSize += size;
			
			}
			
			function displayItems(items) {
				
				if (!items)
					return;
					
				if (!items.length) {
					$results.hide();
					return;
				}
				
				var html = '';
				for (var i = 0; i < items.length; i++)
					html += '<li key="' + encodeURI(items[i].key) + '">' + 
						items[i].value + '</li>';

				// Add a handler to automatically hide results
				// on click event to the document outside of results.
				if ($results.is(':hidden'))
					$(document).bind('mousedown', function(e) {
						if (canHideOnBlur) {
							$results.hide();
							$(this).unbind(e);
						}
					});

				// add new results and show drop down
				$results.html(html).show();
									
				$results.position({
					my: 'left top',
					at: 'left bottom',
					of: $input,
					collision: 'flip'
				});
				
				// help IE users if possible
				try {
					$results.bgiframe();
				} catch(e) { }
											
				$results
					.children('li')
					.mouseover(function() {
						$results.children('li').removeClass(options.selectClass);
						$(this).addClass(options.selectClass);
					})
					.mouseup(function(e) {
						e.preventDefault(); 
						e.stopPropagation();
						selectCurrentResult();
					});
					
			}
			
			function getDataFromString(string) {
			
				var data = {
					'key' : null, 
					'value' : null
				};
			
				var tokens = $.trim(string).split(options.dataDelimiter);
				
				if (tokens.length == 2) {
				
					data.key = tokens[0];
					data.value = tokens[1];
				
				} else {
				
					data.key = data.value = tokens[0];
				
				}

				return data;
				
			}
			
			function parseTxt(txt, q) {
				
				var items = [];
				var lines = txt.split(options.delimiter);
				
				// parse returned data for non-empty items
				for (var i = 0; i < lines.length; i++) {

					var data = getDataFromString(lines[i]);					

					if (data.key && data.value) {
					
						// apply styles to part of value that matches q
						data.value = data.value.replace(
							new RegExp(q, 'ig'), 
							function(q) { return '<span class="' + 
								options.matchClass + '">' + q + '</span>' }
						);
							
						items[items.length] = data;						
					}
					
				}
				
				return items;
			}
			
			function getCurrentResult() {
			
				if (!$results.is(':visible'))
					return false;
			
				var $currentResult = $results.children('li.' + options.selectClass);
				
				if (!$currentResult.length)
					$currentResult = false;
					
				return $currentResult;

			}
			
			function selectCurrentResult() {
			
				$currentResult = getCurrentResult();
			
				if ($currentResult) {

					var text = $currentResult.text();
					var key = $currentResult.attr('key');

					$input.val(text);

					// save "key" field if possible
					if (key) {
						
						$hiddenInput
							.val(key)
							.triggerHandler('change');
						
					} else {
						
						$hiddenInput.val(text);
						
					}

					$results.hide();

					if (options.onSelect)
						options.onSelect.apply($input[0], [$hiddenInput.val()]);

					// if mouse is used to select result, 
					// focus is lost unless....
					$input
						.unbind('focus', suggest) // don't cause a popup
						.focus()
						.bind('focus', suggest);
					
				}
			
			}
			
			function nextResult() {
			
				$currentResult = getCurrentResult();
			
				if ($currentResult)
					$currentResult
						.removeClass(options.selectClass)
						.next()
							.addClass(options.selectClass);
				else
					// .slice() is bug fix, :first-child doesn't seem to work in IE6
					$results.children('li').slice(0, 1).addClass(options.selectClass);
			
			}
			
			function prevResult() {
			
				$currentResult = getCurrentResult();
			
				if ($currentResult)
					$currentResult
						.removeClass(options.selectClass)
						.prev()
							.addClass(options.selectClass);
				else
					$results.children('li:last-child').addClass(options.selectClass);
			
			}

			var timeout = false;		// hold timeout ID for suggestion results to appear	
			var prevLength = 0;			// last recorded length of $input.val()
			var cache = [];				// cache MRU list
			var cacheSize = 0;			// size of cache in chars (bytes?)
			var canHideOnBlur = true;	// boolean - can popup be hidden on blur?

			var $results = $(document.createElement("ul"))
				.addClass(options.resultsClass)
				.appendTo('body')
				.mouseover(function() {
					canHideOnBlur = false;
				})
				.mouseout(function() {
					canHideOnBlur = true;
				});

			var $input = $(input)
				.attr("autocomplete", "off")
				// remove the name of original <input> so form isn't confused, 
				// set 'was' attribute to old name just in case you need it
				.attr('was', $(input).attr('name') + '')
				.removeAttr('name')
				.focus(suggest)
				// hide popup if possible
				.blur(function() {
					if (canHideOnBlur)
						$results.hide();
				});

				
			// I really hate browser detection, but I don't see any other way
			if ($.browser.mozilla)
				$input.keypress(processKey);	// onkeypress repeats arrow keys in Mozilla/Opera
			else
				$input.keydown(processKey);		// onkeydown repeats arrow keys in IE/Safari
				
			// actual data sent to form can be different
			// than what's actually seen in the visible <input />
			var data = getDataFromString($input.val());
			
			$input.val(data.value);
			
			// this hidden <input> will be the proxy by which $input's value gets sent to the form
			// .val() is to fix weird caching of hidden <input>'s bug
			var $hiddenInput = $('<input type="hidden" name="' + 
					$input.attr('was') +'" value="' + data.key + '" />')
				// Append to parent <form> after $input.
				.insertAfter($input);

			// hack: for onSelect functions
			input.hiddenInput = $hiddenInput[0];
			
			// Copy value to the hidden input if it's empty on submit.
			$input.closest('form').bind('submit', function() {
				if (!$hiddenInput.val())
					$hiddenInput.val($input.val());
			});
			
		}
		
		$.fn.suggest = function(source, options) {
		
			if (!source)
				return;
		
			options = options || {};
			
			// the URL for source of results
			options.source = source;
			
			// milliseconds after last keypress to display drop down
			options.delay = options.delay || 150;
			
			// class to give results <ul>
			options.resultsClass = options.resultsClass || 'ac_results';
			
			// class to give to selected <li>
			options.selectClass = options.selectClass || 'ac_over';
			
			// class to give to matching part of results text in <li>
			options.matchClass = options.matchClass || 'ac_match';
			
			// number of chars before checking for possibilities
			options.minchars = options.minchars || 2;
			
			// line delimeter for results
			options.delimiter = options.delimiter || '\n';
			
			// function to be called on selected result (in context of <input>)
			options.onSelect = options.onSelect || false;
			
			// max cache size in chars (bytes)
			options.maxCacheSize = options.maxCacheSize || 65536;
			
			// delimeter in lines of results for key/value
			options.dataDelimiter = options.dataDelimiter || '||';

			this.not('*[was]').each(function() {
				new $.suggest(this, options);
			});
	
			return this;
			
		};
		
	})(jQuery);	
