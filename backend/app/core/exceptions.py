from fastapi import HTTPException, status

class InsightGraphException(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class NotFoundException(InsightGraphException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)

class AuthenticationException(InsightGraphException):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=status.HTTP_401_UNAUTHORIZED)

class PermissionException(InsightGraphException):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)

class ValidationException(InsightGraphException):
    def __init__(self, message: str = "Validation error"):
        super().__init__(message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
