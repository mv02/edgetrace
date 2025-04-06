#ifndef METHOD_H
#define METHOD_H

#include <stdbool.h>

enum method_reachability { UNREACHABLE, SPURIOUSLY_REACHABLE, TRULY_REACHABLE };

typedef struct method {
    int id;
    char* name;
    char* declared_type;
    char* params;
    char* return_type;
    char* qualified_name;
    char* display;
    char* flags;
    bool is_entrypoint;
    enum method_reachability reachability;
    double value;
    struct method* equivalent;
} method_t;

method_t* method_create(int id, char* name, char* declared_type, char* params, char* return_type,
                        char* display, char* flags, bool is_entrypoint);
void method_destroy(method_t* method);
void method_print(method_t* method);
void method_print_short(method_t* method);
void method_print_cypher(method_t* method);

#endif
