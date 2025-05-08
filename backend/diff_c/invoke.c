#include <stdio.h>
#include <stdlib.h>

#include "invoke.h"
#include "method.h"

invoke_t* invoke_create(int id, method_t* method, method_t* target, char* bci, bool is_direct)
{
    invoke_t* invoke = malloc(sizeof(invoke_t));
    if (invoke == NULL) {
        return NULL;
    }

    invoke->id = id;
    invoke->method = method;
    invoke->target = target;
    invoke->bci = bci;
    invoke->is_direct = is_direct;
    invoke->next = NULL;

    invoke->targets_capacity = 32;
    invoke->targets = malloc(invoke->targets_capacity * sizeof(method_t*));
    if (invoke->targets == NULL) {
        free(invoke);
        return NULL;
    }
    invoke->target_count = 0;

    return invoke;
}

void invoke_destroy(invoke_t* invoke)
{
    free(invoke->targets);
    free(invoke);
}

void invoke_print(invoke_t* invoke)
{
    printf("Invoke %d ", invoke->id);
    if (invoke->is_direct) {
        printf("(direct): ");
    } else {
        printf("(virtual, %d targets): ", invoke->target_count);
    }

    method_print_short(invoke->method);
    printf(" -> ");
    method_print_short(invoke->target);

    if (invoke->target_count > 1) {
        for (int i = 0; i < invoke->target_count; i++) {
            printf("\n  %s -> ", invoke->targets[i]->id == invoke->target->id ? "*" : " ");
            method_print(invoke->targets[i]);
        }
    }
}

void invoke_add_call_target(invoke_t* invoke, method_t* target)
{
    if (invoke->target_count == invoke->targets_capacity) {
        invoke->targets_capacity *= 2;
        invoke->targets = realloc(invoke->targets, invoke->targets_capacity * sizeof(method_t*));
    }
    invoke->targets[invoke->target_count++] = target;
}
