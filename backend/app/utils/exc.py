class DocumentExtractorError(ValueError):
    """Base exception for errors related to the DocumentExtractorNode."""
    
    def __init__(self, message, *args, **kwargs):
        self.message = message
        super().__init__(message, *args, **kwargs)
    
    def to_dict(self):
        return {
            'error_type': self.__class__.__name__,
            'message': str(self),
            'details': {
                'args': self.args,
                'message': self.message if hasattr(self, 'message') else str(self)
            }
        }


class FileDownloadError(DocumentExtractorError):
    """Exception raised when there's an error downloading a file."""
    def to_dict(self):
        return {
            'error_type': self.__class__.__name__,
            'message': str(self),
            'details': {
                'args': self.args,
                'message': self.message if hasattr(self, 'message') else str(self)
            }
        }


class UnsupportedFileTypeError(DocumentExtractorError):
    """Exception raised when trying to extract text from an unsupported file type."""
    def to_dict(self):
        return {
            'error_type': self.__class__.__name__,
            'message': str(self),
            'details': {
                'args': self.args,
                'message': self.message if hasattr(self, 'message') else str(self)
            }
        }


class TextExtractionError(DocumentExtractorError):
    """Exception raised when there's an error during text extraction from a file."""
    def to_dict(self):
        return {
            'error_type': self.__class__.__name__,
            'message': str(self),
            'details': {
                'args': self.args,
                'message': self.message if hasattr(self, 'message') else str(self)
            }
        }
