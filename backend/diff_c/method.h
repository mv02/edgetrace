/**
 * File: backend/app/diff_c/method.h
 * Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
 * Description: Declares a structure representing call graph methods,
 *              and functions for creating, destroying, and printing them.
 */

#ifndef METHOD_H
#define METHOD_H

#include <stdbool.h>

typedef struct method {
    int id;
    char* name;
    char* declared_type;
    char* params;
    char* return_type;
    char* qualified_name;
    char* display;
    char* flags;
    bool is_entry_point;
    bool is_reachable;
    double value;
    struct method* equivalent;
} method_t;

method_t* method_create(int id, char* name, char* declared_type, char* params, char* return_type,
                        char* display, char* flags, bool is_entry_point);
void method_destroy(method_t* method);
void method_print(method_t* method);
void method_print_short(method_t* method);
void method_print_cypher(method_t* method);

#endif
