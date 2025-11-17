import logging
import os
import sys
import uuid
import time
import threading
import platform
from functools import wraps
from datetime import datetime

# Check if we're on Windows
IS_WINDOWS = platform.system() == 'Windows'

# Try to enable ANSI colors on Windows
if IS_WINDOWS:
    try:
        import colorama
        colorama.init()
        ANSI_ENABLED = True
    except ImportError:
        ANSI_ENABLED = False
else:
    ANSI_ENABLED = True

# ANSI color codes for terminal output
COLORS = {
    'RESET': '\033[0m',
    'RED': '\033[91m',      # ERROR
    'YELLOW': '\033[93m',   # WARNING
    'GREEN': '\033[92m',    # INFO
    'BLUE': '\033[94m',     # DEBUG
    'CYAN': '\033[96m',     # Process operations
    'MAGENTA': '\033[95m',  # Service operations
    'BOLD': '\033[1m',
    'UNDERLINE': '\033[4m'
}

# Empty color codes for when ANSI is not available
NO_COLORS = {k: '' for k in COLORS}

# Thread-local storage for request context
_thread_local = threading.local()

def get_request_id():
    """Get the current request ID from thread-local storage or generate a new one"""
    if not hasattr(_thread_local, 'request_id'):
        _thread_local.request_id = str(uuid.uuid4())[:8]
    return _thread_local.request_id

def set_request_id(request_id):
    """Set the request ID for the current thread"""
    _thread_local.request_id = request_id

def get_process_id():
    """Get the current process ID from thread-local storage or generate a new one"""
    if not hasattr(_thread_local, 'process_id'):
        _thread_local.process_id = str(uuid.uuid4())[:8]
    return _thread_local.process_id

def set_process_id(process_id):
    """Set the process ID for the current thread"""
    _thread_local.process_id = process_id

class RequestContextFilter(logging.Filter):
    """Filter that adds request_id and process_id to log records"""
    def filter(self, record):
        record.request_id = get_request_id()
        record.process_id = get_process_id()
        return True

class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors and request context"""
    def __init__(self, fmt=None, datefmt=None, style='%', use_colors=True):
        super().__init__(fmt, datefmt, style)
        self.use_colors = use_colors and ANSI_ENABLED
    
    def format(self, record):
        levelname = record.levelname
        message = super().format(record)
        
        if not self.use_colors:
            return message
            
        if levelname == 'ERROR':
            return f"{COLORS['RED']}{message}{COLORS['RESET']}"
        elif levelname == 'WARNING':
            return f"{COLORS['YELLOW']}{message}{COLORS['RESET']}"
        elif levelname == 'INFO':
            return f"{COLORS['GREEN']}{message}{COLORS['RESET']}"
        elif levelname == 'DEBUG':
            return f"{COLORS['BLUE']}{message}{COLORS['RESET']}"
        return message

def setup_logger(name, level=logging.INFO, log_to_file=True, use_colors=True):
    """Set up a logger with console and optional file output"""
    logger = logging.getLogger(name)
    logger.propagate = False  # Prevent propagation to root logger
    logger.setLevel(level)
    
    # Remove any existing handlers to avoid duplicates
    for handler in logger.handlers:
        logger.removeHandler(handler)
    
    # Add request context filter
    logger.addFilter(RequestContextFilter())
    
    # Create console handler with colored formatter
    console_handler = logging.StreamHandler()
    console_formatter = ColoredFormatter(
        '%(asctime)s - [%(request_id)s:%(process_id)s] - %(name)s - %(levelname)s - %(message)s',
        use_colors=use_colors
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # Add file handler if requested
    if log_to_file:
        log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
        os.makedirs(log_dir, exist_ok=True)
        
        file_handler = logging.FileHandler(os.path.join(log_dir, f'{name}.log'), encoding='utf-8')
        file_formatter = logging.Formatter(
            '%(asctime)s - [%(request_id)s:%(process_id)s] - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
    
    return logger

def log_execution_time(logger, level=logging.INFO):
    """Decorator to log function execution time"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            # Extract function context for better logging
            try:
                # For methods, get the class name
                if args and hasattr(args[0], '__class__'):
                    class_name = args[0].__class__.__name__
                    context = f"{class_name}.{func.__name__}"
                else:
                    context = func.__name__
            except:
                context = func.__name__
            
            # Log start of execution
            logger.log(level, f"Starting {context}")
            
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                logger.log(level, f"Completed {context} in {execution_time:.3f}s")
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(f"Failed {context} after {execution_time:.3f}s: {str(e)}")
                raise
        return wrapper
    return decorator

def log_method_calls(logger, level=logging.INFO):
    """Class decorator to log all method calls"""
    def decorator(cls):
        for attr_name in dir(cls):
            if attr_name.startswith('_'):
                continue
                
            attr = getattr(cls, attr_name)
            if callable(attr):
                setattr(cls, attr_name, log_execution_time(logger, level)(attr))
        return cls
    return decorator

def create_process_banner(logger, process_name, process_id=None):
    """Create a banner for process start/end"""
    if process_id is None:
        process_id = get_process_id()
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if ANSI_ENABLED:
        banner = f"{COLORS['MAGENTA']}{COLORS['BOLD']}" \
                f"{process_name} [PROCESS: {process_id}]\n" \
                f"TIMESTAMP: {timestamp}{COLORS['RESET']}"
    else:
        banner = f"{process_name} [PROCESS: {process_id}]\n" \
                f"TIMESTAMP: {timestamp}"
    logger.info(banner)
    return process_id
