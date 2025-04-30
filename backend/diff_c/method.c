#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "method.h"

char* get_qualified_name(char* declared_type, char* name, char* params, char* flags,
                         char* return_type)
{
    char* dst = malloc(strlen(declared_type) + strlen(name) + strlen(params) + strlen(flags) +
                       strlen(return_type) + 6);
    if (dst == NULL) {
        return NULL;
    }

    strcpy(dst, declared_type);
    strcat(dst, ".");
    strcat(dst, name);
    strcat(dst, "(");
    strcat(dst, params);
    strcat(dst, "):");
    strcat(dst, flags);
    strcat(dst, ":");
    strcat(dst, return_type);

    return dst;
}

method_t* method_create(int id, char* name, char* declared_type, char* params, char* return_type,
                        char* display, char* flags, bool is_entrypoint)
{
    method_t* method = malloc(sizeof(method_t));
    if (method == NULL) {
        return NULL;
    }

    method->id = id;
    method->name = strdup(name);
    method->declared_type = strdup(declared_type);
    method->params = strdup(params);
    method->return_type = strdup(return_type);
    method->qualified_name = get_qualified_name(declared_type, name, params, flags, return_type);
    method->display = strdup(display);
    method->flags = strdup(flags);
    method->is_entrypoint = is_entrypoint;
    method->is_reachable = false;
    method->value = 0;
    method->equivalent = NULL;

    return method;
}

void method_destroy(method_t* method)
{
    free(method->name);
    free(method->declared_type);
    free(method->params);
    free(method->return_type);
    free(method->qualified_name);
    free(method->display);
    free(method->flags);
    free(method);
}

void method_print(method_t* method) { printf("%s", method->qualified_name); }

void method_print_short(method_t* method)
{
    printf("%s.%s(%s)", method->declared_type, method->name, method->params);
}

void method_print_cypher(method_t* method)
{
    printf("MATCH (m:Method {Type: '%s', Name: '%s', Parameters: '%s', Return: '%s'}) RETURN m\n",
           method->declared_type, method->name, method->params, method->return_type);
}
