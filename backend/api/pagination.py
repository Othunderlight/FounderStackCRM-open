from rest_framework.pagination import PageNumberPagination, LimitOffsetPagination
from rest_framework.response import Response


class HybridPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 1000
    limit_query_param = 'limit'
    offset_query_param = 'offset'
    default_limit = 15

    def paginate_queryset(self, queryset, request, view=None):
        if 'limit' in request.query_params or 'offset' in request.query_params:
            self._use_offset_pagination = True
            self.limit = self.get_limit(request)
            if self.limit is None:
                return None
            self.offset = self.get_offset(request)
            self.count = self.get_count(queryset)
            self.request = request
            if self.count > self.limit and self.template is not None:
                self.display_page_controls = True
            if self.count == 0 or self.offset > self.count:
                return []
            return list(queryset[self.offset:self.offset + self.limit])
        else:
            self._use_offset_pagination = False
            return PageNumberPagination.paginate_queryset(self, queryset, request, view)

    def get_limit(self, request):
        if self.limit_query_param:
            try:
                limit = int(request.query_params[self.limit_query_param])
                if limit < 0:
                    return None
                if self.max_page_size and limit > self.max_page_size:
                    return self.max_page_size
                return limit
            except (KeyError, ValueError):
                pass
        return self.default_limit

    def get_offset(self, request):
        try:
            return int(request.query_params.get(self.offset_query_param, 0))
        except (KeyError, ValueError):
            return 0

    def get_count(self, queryset):
        try:
            return queryset.count()
        except (AttributeError, TypeError):
            return len(queryset)

    def get_next_link(self):
        if not self._use_offset_pagination:
            return PageNumberPagination.get_next_link(self)
        if self.offset + self.limit >= self.count:
            return None
        url = self.request.build_absolute_uri()
        return self._replace_offset(url, self.offset + self.limit)

    def get_previous_link(self):
        if not self._use_offset_pagination:
            return PageNumberPagination.get_previous_link(self)
        if self.offset <= 0:
            return None
        url = self.request.build_absolute_uri()
        return self._replace_offset(url, self.offset - self.limit)

    def _replace_offset(self, url, new_offset):
        from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        params['offset'] = [str(new_offset)]
        params['limit'] = [str(self.limit)]
        new_query = urlencode(params, doseq=True)
        return urlunparse(parsed._replace(query=new_query))

    def get_paginated_response(self, data):
        if not self._use_offset_pagination:
            return PageNumberPagination.get_paginated_response(self, data)
        return Response({
            'count': self.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data
        })

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'count': {'type': 'integer', 'example': 123},
                'next': {'type': 'string', 'nullable': True, 'format': 'uri', 'example': 'http://api.example.org/accounts/?limit=15&offset=15'},
                'previous': {'type': 'string', 'nullable': True, 'format': 'uri', 'example': 'http://api.example.org/accounts/?limit=15&offset=0'},
                'results': schema,
            },
        }


StandardResultsSetPagination = HybridPagination
