from rest_framework import renderers
from helpers.toon import to_toon

class ToonRenderer(renderers.BaseRenderer):
    media_type = 'text/plain'
    format = 'toon'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            return ''
        return to_toon(data).encode('utf-8')
