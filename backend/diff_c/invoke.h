#ifndef INVOKE_H
#define INVOKE_H

#include <stdbool.h>

#include "method.h"

typedef struct invoke {
    int id;
    method_t* method;
    method_t* target;
    char* bci;
    bool is_direct;
    method_t** targets;
    int targets_capacity;
    int target_count;
    struct invoke* next;
} invoke_t;

invoke_t* invoke_create(int id, method_t* method, method_t* target, char* bci, bool is_direct);
void invoke_destroy(invoke_t* invoke);
void invoke_print(invoke_t* invoke);
void invoke_add_call_target(invoke_t* invoke, method_t* target);

#endif
