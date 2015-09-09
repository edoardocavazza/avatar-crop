# Avatar Crop

## The configuration Object

The `AvatarCrop` constructor requires two arguments: the parent DOM element of the canvas and a set of options. At any time, you can update the configuration using the `AvatarCrop.config( options )` method.

Let's see the set of available options:

* [interactive](#interactive)
* [droppable](#droppable)
* [selectable](#selectable)
* [width](#width)
* [height](#height)
* [message](#message)
* [minZoom](#minzoom)
* [maxZoom](#maxzoom)

### interactive
`Boolean`|`true`
	
Enable mouse and touch gestures on the canvas (drag, pinch to zoom, wheel to zoom, doubleclick to fit the image into the canvas).
	
### droppable
`Boolean`|`true`

Enable image Drag&Drop on the canvas.

### selectable
`Boolean`|`true`

Enable click to select a file from the filesystem to upload.

### width
`Number`|`256`

The canvas artboard width in pixels.

### height
`Number`|`256`

The canvas artboard height in pixels.

### message
`String`|`"Drop an image or click to select one."`

The message to write to the canvas when an image is not provided yet.

### minZoom
`Number`|`1`

The zoom range left limit.

### maxZoom
`Number`|`Infinity`

The zoom range right limit.